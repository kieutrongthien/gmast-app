import { computed } from 'vue';
import {
  resultSyncState,
  hydrateResultFailures,
  retryResultSync,
  dismissResultToast
} from '@/services/messages/resultSyncManager';

export const useResultSync = () => {
  const failureCount = computed(() => resultSyncState.failureCount.value);

  const toastOpen = computed(() => resultSyncState.toastVisible.value);

  const hasFailures = computed(() => failureCount.value > 0);

  const lastErrorMessage = computed(
    () => resultSyncState.lastErrorMessage.value ?? 'Không thể đồng bộ kết quả gửi.'
  );

  const retryFailedResults = async (): Promise<void> => {
    await retryResultSync();
  };

  const hydrateFailures = async (): Promise<void> => {
    await hydrateResultFailures();
  };

  const dismissToast = (): void => {
    dismissResultToast();
  };

  return {
    failedResults: resultSyncState.failedResults,
    failureCount,
    hasFailures,
    toastOpen,
    lastErrorMessage,
    isRetrying: resultSyncState.isRetrying,
    hydrateFailures,
    retryFailedResults,
    dismissToast
  } as const;
};
