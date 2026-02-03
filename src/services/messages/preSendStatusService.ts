import axios from 'axios';
import { httpClient } from '@/lib/httpClient';
import { withRetry } from '@/utils/retry';
import type { RemoteMessageStatusResponse, PreSendStatusResult } from '@/types/messageStatus';
import { PreSendState } from '@/types/messageStatus';

const STATUS_ENDPOINT = (messageId: string) => `/messages/${messageId}/status`;

const toBoolean = (value?: boolean): boolean => Boolean(value);

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
    const { data } = await withRetry(() => httpClient.get<RemoteMessageStatusResponse>(STATUS_ENDPOINT(messageId)));
    return normalizeResponse(messageId, data);
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
