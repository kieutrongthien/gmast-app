import { withRetry } from '@/utils/retry';
import { updateSmsScheduleStatus } from '@/services/mobile';
import type { DeliveryResultPayload, DeliveryResultResponse } from '@/types/messageResult';

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

export const reportDeliveryResult = async (
  payload: DeliveryResultPayload,
  attempts = DEFAULT_ATTEMPTS
): Promise<DeliveryResultResponse> => {
  if (!payload.messageId) {
    throw new Error('reportDeliveryResult requires messageId');
  }

  await withRetry(
    () =>
      updateSmsScheduleStatus(payload.messageId, {
        status: toScheduleStatus(payload.outcome),
        retry_increment: payload.outcome === 'failed' || payload.outcome === 'cancelled'
      }),
    { retries: attempts - 1 }
  );

  return {
    success: true,
    stored: true,
    messageId: payload.messageId
  };
};
