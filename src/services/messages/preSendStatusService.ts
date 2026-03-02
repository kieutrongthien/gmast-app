import axios from 'axios';
import { withRetry } from '@/utils/retry';
import type { RemoteMessageStatusResponse, PreSendStatusResult } from '@/types/messageStatus';
import { PreSendState } from '@/types/messageStatus';
import { getSmsScheduleDetail } from '@/services/mobile';

const toBoolean = (value?: boolean): boolean => Boolean(value);

const toRemotePayload = (record: Record<string, unknown>): RemoteMessageStatusResponse => {
  const statusValue =
    typeof record.status === 'string' || typeof record.status === 'number'
      ? String(record.status)
      : 'unknown';

  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    status: statusValue,
    updated_at: typeof record.updated_at === 'string' ? record.updated_at : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
    checked_at: new Date().toISOString()
  };
};

const normalizeResponse = (
  messageId: string,
  payload: RemoteMessageStatusResponse
): PreSendStatusResult => {
  const status = (payload.status ?? 'unknown').toLowerCase();
  const flags = {
    processing: toBoolean(payload.flags?.processing),
    sent: toBoolean(payload.flags?.sent),
    failed: toBoolean(payload.flags?.failed)
  };

  if (flags.sent || status === 'sent') {
    return {
      messageId,
      state: PreSendState.AlreadySent,
      canSend: false,
      rawStatus: status,
      flags,
      checkedAt: payload.checked_at ?? payload.checkedAt ?? payload.updatedAt ?? payload.updated_at,
      metadata: payload.metadata,
      reason: 'Message already sent'
    };
  }

  if (flags.processing || status === 'processing' || status === 'sending') {
    return {
      messageId,
      state: PreSendState.AlreadyProcessing,
      canSend: false,
      rawStatus: status,
      flags,
      checkedAt: payload.checked_at ?? payload.checkedAt,
      metadata: payload.metadata,
      reason: 'Message is processing'
    };
  }

  if (flags.failed || status === 'failed') {
    return {
      messageId,
      state: PreSendState.Failed,
      canSend: true,
      rawStatus: status,
      flags,
      checkedAt: payload.checked_at ?? payload.checkedAt,
      metadata: payload.metadata,
      reason: 'Previous attempt failed; allowed to retry'
    };
  }

  return {
    messageId,
    state: PreSendState.Sendable,
    canSend: true,
    rawStatus: status,
    flags,
    checkedAt: payload.checked_at ?? payload.checkedAt,
    metadata: payload.metadata,
    reason: 'Message can be sent'
  };
};

const notFoundResult = (messageId: string): PreSendStatusResult => ({
  messageId,
  state: PreSendState.NotFound,
  canSend: true,
  rawStatus: null,
  flags: {},
  reason: 'Message not found, treated as sendable'
});

export const checkPreSendStatus = async (messageId: string): Promise<PreSendStatusResult> => {
  if (!messageId) {
    throw new Error('checkPreSendStatus requires a messageId');
  }

  try {
    const detail = await withRetry(() => getSmsScheduleDetail(messageId));
    const payload = toRemotePayload(detail.item);
    return normalizeResponse(messageId, payload);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return notFoundResult(messageId);
      }
      if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
        throw new Error('Network offline. Unable to verify message status.');
      }
    }
    throw error instanceof Error ? error : new Error('Unknown error during status check');
  }
};
