import { computed, ref } from 'vue';
import type { DeliveryResultPayload, DeliveryResultResponse } from '@/types/messageResult';
import { reportDeliveryResult } from '@/services/messages/resultReportingService';
import { emitAnalyticsEvent } from '@/services/messages/analytics';
import {
  loadFailedResults,
  upsertFailedResult,
  removeFailedResult,
  clearFailedResults,
  type FailedResultEntry
} from '@/services/messages/resultStorage';
import { tr } from '@/i18n/translate';

const failedResults = ref<FailedResultEntry[]>([]);
const toastVisible = ref(false);
const isRetrying = ref(false);
const lastErrorMessage = ref<string | null>(null);

const reasonFromError = (error?: unknown): string | undefined => {
  if (!error) {
    return undefined;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return undefined;
};

const refreshStateFromStorage = async (): Promise<void> => {
  failedResults.value = await loadFailedResults();
  toastVisible.value = failedResults.value.length > 0;
  if (!toastVisible.value) {
    lastErrorMessage.value = null;
  } else {
    lastErrorMessage.value =
      failedResults.value[failedResults.value.length - 1]?.failureReason ?? lastErrorMessage.value;
  }
};

export const hydrateResultFailures = async (): Promise<void> => {
  await refreshStateFromStorage();
};

export const recordResultSyncFailure = async (
  payload: DeliveryResultPayload,
  error?: unknown
): Promise<void> => {
  const failureReason = reasonFromError(error) ?? tr('errors.resultStatusSyncFailed');
  failedResults.value = await upsertFailedResult(payload, failureReason);
  toastVisible.value = true;
  lastErrorMessage.value = failureReason;
  await emitAnalyticsEvent('result_sync_failure', {
    messageId: payload.messageId,
    reason: failureReason,
    failureCount: failedResults.value.length
  });
};

export const retryResultSync = async (): Promise<{ success: number; failed: number }> => {
  if (isRetrying.value) {
    return { success: 0, failed: failedResults.value.length };
  }
  isRetrying.value = true;
  let success = 0;
  let failed = 0;

  try {
    const snapshot = [...failedResults.value];
    for (const entry of snapshot) {
      try {
        await reportDeliveryResult(entry.payload);
        await removeFailedResult(entry.messageId);
        success += 1;
      } catch (error) {
        failed += 1;
        failedResults.value = await upsertFailedResult(entry.payload, reasonFromError(error));
      }
    }
  } finally {
    await refreshStateFromStorage();
    isRetrying.value = false;
  }

  await emitAnalyticsEvent('result_sync_retry', {
    success,
    failed,
    remaining: failedResults.value.length
  });

  return { success, failed };
};

export const dismissResultToast = (): void => {
  toastVisible.value = false;
};

export const syncDeliveryResult = async (
  payload: DeliveryResultPayload
): Promise<DeliveryResultResponse> => {
  try {
    return await reportDeliveryResult(payload);
  } catch (error) {
    await recordResultSyncFailure(payload, error);
    throw error;
  }
};

export const clearResultFailures = async (): Promise<void> => {
  failedResults.value = [];
  toastVisible.value = false;
  lastErrorMessage.value = null;
  await clearFailedResults();
};

export const resultSyncState = {
  failedResults,
  toastVisible,
  isRetrying,
  lastErrorMessage,
  failureCount: computed(() => failedResults.value.length)
};
