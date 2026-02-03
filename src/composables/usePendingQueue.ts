import { queueStore } from '@/stores/queueStore';

export const usePendingQueue = () => {
  const startAutoRefresh = () => queueStore.startAutoRefresh();

  return {
    messages: queueStore.messages,
    meta: queueStore.meta,
    loading: queueStore.loading,
    error: queueStore.error,
    lastUpdated: queueStore.lastUpdated,
    usingMock: queueStore.usingMock,
    loadQueue: queueStore.loadQueue,
    refreshQueue: queueStore.refreshQueue,
    startAutoRefresh
  };
};
