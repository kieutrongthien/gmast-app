import { withRetry } from '@/utils/retry';
import { getSmsScheduleDetail, updateSmsScheduleStatus } from '@/services/mobile';
import type { DeliveryResultPayload, DeliveryResultResponse } from '@/types/messageResult';
import type { SmsScheduleStatus } from '@/types/mobileApi';
import { isHttpError } from '@/lib/httpClient';

const DEFAULT_ATTEMPTS = 3;

const toScheduleStatus = (outcome: DeliveryResultPayload['outcome']): 'pending' | 'failed' | 'sent' => {
  switch (outcome) {
    case 'sent':
    case 'delivered':
      return 'sent';
    case 'failed':
    case 'cancelled':
      return 'failed';
    case 'queued':
    default:
      return 'pending';
  }
};

const isInvalidTransition = (error: unknown): boolean => {
  if (!isHttpError(error) || error.response.status !== 422) {
    return false;
  }

  const responsePayload = error.response.data as Record<string, unknown> | undefined;
  const messageText = typeof responsePayload?.message === 'string' ? responsePayload.message : '';
  return messageText.toLowerCase().includes('invalid status transition');
};

type RuntimeStatus = 'pending' | 'processing' | 'failed' | 'sent' | 'unknown';

const normalizeRuntimeStatus = (value: unknown): RuntimeStatus => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    switch (value) {
      case 0:
        return 'pending';
      case 2:
        return 'processing';
      case -1:
        return 'failed';
      case 1:
        return 'sent';
      default:
        return 'unknown';
    }
  }

  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'pending' || normalized === '0') {
    return 'pending';
  }
  if (normalized === 'processing' || normalized === '2' || normalized === 'sending') {
    return 'processing';
  }
  if (normalized === 'failed' || normalized === '-1') {
    return 'failed';
  }
  if (normalized === 'sent' || normalized === '1') {
    return 'sent';
  }
  return 'unknown';
};

const readCurrentStatus = async (messageId: string): Promise<RuntimeStatus> => {
  const detail = await getSmsScheduleDetail(messageId);
  return normalizeRuntimeStatus(detail.item.status);
};

const resolveNextStatus = (current: RuntimeStatus, target: SmsScheduleStatus): SmsScheduleStatus | null => {
  if (target === 'sent') {
    if (current === 'sent') {
      return null;
    }
    if (current === 'pending') {
      return 'processing';
    }
    if (current === 'processing') {
      return 'sent';
    }
    if (current === 'failed') {
      return 'pending';
    }
    return 'processing';
  }

  if (target === 'failed') {
    if (current === 'failed') {
      return null;
    }
    if (current === 'pending' || current === 'processing') {
      return 'failed';
    }
    if (current === 'sent') {
      return null;
    }
    return 'processing';
  }

  if (target === 'pending') {
    if (current === 'pending') {
      return null;
    }
    if (current === 'failed') {
      return 'pending';
    }
    return null;
  }

  if (target === 'processing') {
    if (current === 'processing') {
      return null;
    }
    if (current === 'pending') {
      return 'processing';
    }
    if (current === 'failed') {
      return 'pending';
    }
  }

  return null;
};

const updateStatusWithFallback = async (
  messageId: string,
  targetStatus: SmsScheduleStatus,
  retryIncrementOnFailure: boolean
): Promise<void> => {
  let current = await readCurrentStatus(messageId);

  for (let step = 0; step < 8; step += 1) {
    const next = resolveNextStatus(current, targetStatus);
    if (!next) {
      return;
    }

    try {
      await updateSmsScheduleStatus(messageId, {
        status: next,
        retry_increment: next === 'failed' ? retryIncrementOnFailure : false
      });
      current = next;
    } catch (error) {
      if (!isInvalidTransition(error)) {
        throw error;
      }

      current = await readCurrentStatus(messageId);
    }
  }

  throw new Error('Unable to reach target SMS status due to transition constraints');
};

export const reportDeliveryResult = async (
  payload: DeliveryResultPayload,
  attempts = DEFAULT_ATTEMPTS
): Promise<DeliveryResultResponse> => {
  if (!payload.messageId) {
    throw new Error('reportDeliveryResult requires messageId');
  }

  const targetStatus = toScheduleStatus(payload.outcome);
  const retryIncrementOnFailure = payload.outcome === 'failed' || payload.outcome === 'cancelled';

  await withRetry(
    () => updateStatusWithFallback(payload.messageId, targetStatus, retryIncrementOnFailure),
    { retries: attempts - 1 }
  );

  return {
    success: true,
    stored: true,
    messageId: payload.messageId
  };
};
