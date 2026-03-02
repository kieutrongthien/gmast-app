import { withRetry } from '@/utils/retry';
import { updateSmsScheduleStatus } from '@/services/mobile';
import type { DeliveryResultPayload, DeliveryResultResponse } from '@/types/messageResult';
import type { SmsScheduleStatus } from '@/types/mobileApi';
import axios from 'axios';

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
  if (!axios.isAxiosError(error) || error.response?.status !== 422) {
    return false;
  }

  const responsePayload = error.response.data as Record<string, unknown> | undefined;
  const messageText = typeof responsePayload?.message === 'string' ? responsePayload.message : '';
  return messageText.toLowerCase().includes('invalid status transition');
};

const buildTransitionPlans = (targetStatus: SmsScheduleStatus): SmsScheduleStatus[][] => {
  if (targetStatus === 'sent') {
    return [
      ['sent'],
      ['processing', 'sent'],
      ['pending', 'processing', 'sent']
    ];
  }

  if (targetStatus === 'failed') {
    return [
      ['failed'],
      ['processing', 'failed'],
      ['pending', 'processing', 'failed']
    ];
  }

  if (targetStatus === 'processing') {
    return [['processing']];
  }

  return [['pending']];
};

const applyStatusPlan = async (
  messageId: string,
  plan: SmsScheduleStatus[],
  retryIncrementOnFailure: boolean
): Promise<void> => {
  for (let index = 0; index < plan.length; index += 1) {
    const status = plan[index];
    const isFinalStep = index === plan.length - 1;
    await updateSmsScheduleStatus(messageId, {
      status,
      retry_increment: isFinalStep && status === 'failed' ? retryIncrementOnFailure : false
    });
  }
};

const updateStatusWithFallback = async (
  messageId: string,
  targetStatus: SmsScheduleStatus,
  retryIncrementOnFailure: boolean
): Promise<void> => {
  const plans = buildTransitionPlans(targetStatus);
  let lastError: unknown = null;

  for (const plan of plans) {
    try {
      await applyStatusPlan(messageId, plan, retryIncrementOnFailure);
      return;
    } catch (error) {
      lastError = error;
      if (!isInvalidTransition(error)) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Unable to update SMS status due to invalid state transition');
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
