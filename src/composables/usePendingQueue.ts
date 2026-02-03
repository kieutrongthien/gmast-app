import { ref, computed } from 'vue';
import type { QueueSnapshot } from '@/types/queue';
import { fetchFullPendingQueue, getCachedPendingQueue } from '@/services/messages/pendingMessageClient';
import { buildMockQueueSnapshot } from '@/data/mockQueue';

interface LoadOptions {
  skipCache?: boolean;
}

const DEFAULT_PAGE_SIZE = 50;

export const usePendingQueue = () => {
  const snapshot = ref<QueueSnapshot | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<string | null>(null);
  const usingMock = ref(false);

  const assignSnapshot = (next: QueueSnapshot, mock = false) => {
    snapshot.value = next;
    lastUpdated.value = next.updatedAt;
    usingMock.value = mock;
  };

  const loadQueue = async (options: LoadOptions = {}) => {
    if (loading.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    if (!options.skipCache) {
      const cached = await getCachedPendingQueue();
      if (cached) {
        assignSnapshot(cached, false);
      }
    }

    try {
      const result = await fetchFullPendingQueue({ pageSize: DEFAULT_PAGE_SIZE, persist: true });
      assignSnapshot(result, false);
    } catch (err) {
      const mock = buildMockQueueSnapshot();
      assignSnapshot(mock, true);
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  };

  const refreshQueue = async () => loadQueue({ skipCache: true });

  return {
    messages: computed(() => snapshot.value?.messages ?? []),
    meta: computed(() => snapshot.value?.meta ?? null),
    loading: computed(() => loading.value),
    error,
    lastUpdated: computed(() => lastUpdated.value),
    usingMock: computed(() => usingMock.value),
    loadQueue,
    refreshQueue
  };
};
