import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { QueueSnapshot } from '@/types/queue';
import { appConfig } from '@/config/appConfig';

const fetchQueueMock = vi.fn();
const getCachedQueueMock = vi.fn();
const buildMockSnapshot = vi.fn();

vi.mock('@/services/messages/pendingMessageClient', () => ({
  fetchPendingMessages: (...args: unknown[]) => fetchQueueMock(...args),
  getCachedPendingQueue: (...args: unknown[]) => getCachedQueueMock(...args)
}));

vi.mock('@/data/mockQueue', () => ({
  buildMockQueueSnapshot: (...args: unknown[]) => buildMockSnapshot(...args)
}));

const createSnapshot = (overrides: Partial<QueueSnapshot> = {}): QueueSnapshot => ({
  messages: [],
  meta: {
    page: 1,
    pageSize: 50,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    fetchedAt: new Date().toISOString()
  },
  updatedAt: new Date().toISOString(),
  ...overrides
});

describe('queueStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    fetchQueueMock.mockReset();
    getCachedQueueMock.mockReset();
    buildMockSnapshot.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates from cache before calling API', async () => {
    const cached = createSnapshot();
    const live = createSnapshot({ updatedAt: new Date(Date.now() + 1000).toISOString() });
    getCachedQueueMock.mockResolvedValue(cached);
    fetchQueueMock.mockResolvedValue(live);

    const { queueStore } = await import('@/stores/queueStore');
    await queueStore.loadQueue();

    expect(getCachedQueueMock).toHaveBeenCalled();
    expect(queueStore.messages.value).toEqual(cached.messages);
    expect(fetchQueueMock).toHaveBeenCalled();
    expect(queueStore.lastUpdated.value).toEqual(live.updatedAt);
  });

  it('throttles refresh calls within the min gap window', async () => {
    const live = createSnapshot();
    getCachedQueueMock.mockResolvedValue(null);
    fetchQueueMock.mockResolvedValue(live);

    const { queueStore } = await import('@/stores/queueStore');
    await queueStore.refreshQueue(true);
    await queueStore.refreshQueue(false);
    expect(fetchQueueMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(appConfig.queue.minRefreshGapMs + 10);
    await queueStore.refreshQueue(false);
    expect(fetchQueueMock).toHaveBeenCalledTimes(2);
  });
});
