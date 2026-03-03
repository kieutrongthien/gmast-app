import { computed, reactive } from 'vue';
import type { QueueSnapshot } from '@/types/queue';
import {
  fetchPendingMessages,
  getCachedPendingQueue
} from '@/services/messages/pendingMessageClient';
import { buildMockQueueSnapshot } from '@/data/mockQueue';
import { appConfig } from '@/config/appConfig';

interface LoadOptions {
  skipCache?: boolean;
  force?: boolean;
}

const DEFAULT_PAGE_SIZE = appConfig.queue.defaultPageSize;
const MIN_REFRESH_GAP_MS = appConfig.queue.minRefreshGapMs;
const AUTO_REFRESH_INTERVAL_MS = appConfig.queue.refreshIntervalMs;

interface QueueStoreState {
  snapshot: QueueSnapshot | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  lastUpdated: string | null;
  usingMock: boolean;
  lastFetchMs: number;
  autoRefreshActive: boolean;
  currentPage: number;
  hasMore: boolean;
}

const state = reactive<QueueStoreState>({
  snapshot: null,
  loading: false,
  loadingMore: false,
  error: null,
  lastUpdated: null,
  usingMock: false,
  lastFetchMs: 0,
  autoRefreshActive: false,
  currentPage: 0,
  hasMore: false
});

let autoRefreshHandle: ReturnType<typeof setInterval> | null = null;
let autoRefreshSubscribers = 0;

const assignSnapshot = (next: QueueSnapshot, mock = false) => {
  state.snapshot = next;
  state.lastUpdated = next.updatedAt;
  state.usingMock = mock;
  state.currentPage = next.meta.page;
  state.hasMore = next.meta.hasNextPage;
};

const loadQueue = async (options: LoadOptions = {}): Promise<QueueSnapshot | null> => {
  if (state.loading) {
    return state.snapshot;
  }

  const now = Date.now();
  if (!options.force && state.lastFetchMs && now - state.lastFetchMs < MIN_REFRESH_GAP_MS) {
    return state.snapshot;
  }

  state.lastFetchMs = now;
  state.loading = true;
  state.error = null;

  if (!options.skipCache) {
    const cached = await getCachedPendingQueue();
    if (cached) {
      assignSnapshot(cached, false);
    }
  }

  try {
    const result = await fetchPendingMessages({ page: 1, pageSize: DEFAULT_PAGE_SIZE, persist: true });
    assignSnapshot(result, false);
    return result;
  } catch (error) {
    const mockSnapshot = buildMockQueueSnapshot();
    assignSnapshot(mockSnapshot, true);
    state.error = error instanceof Error ? error.message : String(error);
    return mockSnapshot;
  } finally {
    state.loading = false;
  }
};

const refreshQueue = async (force = false): Promise<QueueSnapshot | null> =>
  loadQueue({ skipCache: true, force });

const loadNextPage = async (): Promise<QueueSnapshot | null> => {
  if (state.loading || state.loadingMore || !state.hasMore || !state.snapshot) {
    return state.snapshot;
  }

  state.loadingMore = true;
  state.error = null;

  const targetPage = state.currentPage + 1;
  const pageSize = state.snapshot.meta.pageSize || DEFAULT_PAGE_SIZE;

  try {
    const next = await fetchPendingMessages({ page: targetPage, pageSize, persist: false });
    const merged: QueueSnapshot = {
      messages: [...state.snapshot.messages, ...next.messages],
      meta: {
        ...next.meta,
        page: targetPage,
        totalItems: next.meta.totalItems || state.snapshot.messages.length + next.messages.length
      },
      updatedAt: next.updatedAt
    };

    assignSnapshot(merged, false);
    return merged;
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    return state.snapshot;
  } finally {
    state.loadingMore = false;
  }
};

const startAutoRefresh = (): (() => void) => {
  autoRefreshSubscribers += 1;
  state.autoRefreshActive = true;

  if (!autoRefreshHandle) {
    const intervalSource = typeof window !== 'undefined' ? window : globalThis;
    autoRefreshHandle = intervalSource.setInterval(() => {
      void loadQueue({ skipCache: true, force: true });
    }, AUTO_REFRESH_INTERVAL_MS);
  }

  return () => {
    autoRefreshSubscribers = Math.max(0, autoRefreshSubscribers - 1);
    if (autoRefreshSubscribers === 0 && autoRefreshHandle) {
      const clearSource = typeof window !== 'undefined' ? window : globalThis;
      clearSource.clearInterval?.(autoRefreshHandle);
      autoRefreshHandle = null;
      state.autoRefreshActive = false;
    }
  };
};

export const queueStore = {
  state,
  messages: computed(() => state.snapshot?.messages ?? []),
  meta: computed(() => state.snapshot?.meta ?? null),
  loading: computed(() => state.loading),
  loadingMore: computed(() => state.loadingMore),
  hasMore: computed(() => state.hasMore),
  error: computed(() => state.error),
  lastUpdated: computed(() => state.lastUpdated),
  usingMock: computed(() => state.usingMock),
  autoRefreshActive: computed(() => state.autoRefreshActive),
  loadQueue,
  refreshQueue,
  loadNextPage,
  startAutoRefresh
};
