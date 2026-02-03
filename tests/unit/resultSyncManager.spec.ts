import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const preferenceStore: Record<string, string> = {};

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: preferenceStore[key] })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      preferenceStore[key] = value;
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      delete preferenceStore[key];
    })
  }
}));

vi.mock('@/services/messages/resultReportingService', () => ({
  reportDeliveryResult: vi.fn()
}));

vi.mock('@/services/messages/analytics', () => ({
  emitAnalyticsEvent: vi.fn()
}));

import { reportDeliveryResult } from '@/services/messages/resultReportingService';
import { emitAnalyticsEvent } from '@/services/messages/analytics';
import {
  recordResultSyncFailure,
  retryResultSync,
  hydrateResultFailures,
  syncDeliveryResult,
  resultSyncState,
  clearResultFailures
} from '@/services/messages/resultSyncManager';

const mockReport = vi.mocked(reportDeliveryResult);
const mockAnalytics = vi.mocked(emitAnalyticsEvent);

const samplePayload = {
  messageId: '123',
  outcome: 'failed',
  description: 'Network error'
};

beforeEach(async () => {
  Object.keys(preferenceStore).forEach((key) => delete preferenceStore[key]);
  mockReport.mockReset();
  mockAnalytics.mockReset();
  await clearResultFailures();
});

afterEach(async () => {
  await clearResultFailures();
});

describe('resultSyncManager', () => {
  it('records failures and exposes toast state', async () => {
    await recordResultSyncFailure(samplePayload, new Error('Timeout'));

    expect(resultSyncState.failedResults.value).toHaveLength(1);
    expect(resultSyncState.toastVisible.value).toBe(true);
    expect(resultSyncState.lastErrorMessage.value).toContain('Timeout');
    expect(mockAnalytics).toHaveBeenCalledWith(
      'result_sync_failure',
      expect.objectContaining({ messageId: '123' })
    );
  });

  it('retries syncing and clears successful entries', async () => {
    mockReport.mockResolvedValue({ success: true });
    await recordResultSyncFailure(samplePayload, 'fail');

    const result = await retryResultSync();

    expect(mockReport).toHaveBeenCalledWith(samplePayload);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(resultSyncState.failedResults.value).toHaveLength(0);
    expect(resultSyncState.toastVisible.value).toBe(false);
    expect(mockAnalytics).toHaveBeenCalledWith(
      'result_sync_retry',
      expect.objectContaining({ success: 1, failed: 0 })
    );
  });

  it('keeps entries when retry still fails', async () => {
    mockReport.mockRejectedValue(new Error('Still down'));
    await recordResultSyncFailure(samplePayload, 'first fail');

    const result = await retryResultSync();

    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(resultSyncState.failedResults.value).toHaveLength(1);
    expect(resultSyncState.lastErrorMessage.value).toContain('Still down');
  });

  it('syncDeliveryResult stores failure automatically', async () => {
    mockReport.mockRejectedValue(new Error('API error'));

    await expect(syncDeliveryResult(samplePayload)).rejects.toThrow('API error');
    expect(resultSyncState.failedResults.value).toHaveLength(1);
  });

  it('hydrates state from persisted entries', async () => {
    await recordResultSyncFailure(samplePayload, 'stored');
    resultSyncState.failedResults.value = [];
    resultSyncState.toastVisible.value = false;

    await hydrateResultFailures();

    expect(resultSyncState.failedResults.value).toHaveLength(1);
    expect(resultSyncState.toastVisible.value).toBe(true);
  });
});
