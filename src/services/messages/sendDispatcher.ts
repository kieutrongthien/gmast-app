import type { QueueMessage } from '@/types/queue';
import { checkPreSendStatus } from '@/services/messages/preSendStatusService';
import type { PreSendStatusResult } from '@/types/messageStatus';
import { PreSendState } from '@/types/messageStatus';
import { emitAnalyticsEvent } from '@/services/messages/analytics';

export interface DispatchResult {
  message: QueueMessage;
  skipped: boolean;
  reason?: string;
  status?: PreSendStatusResult;
}

export type DispatchHandler = (message: QueueMessage) => Promise<void>;

export interface SendDispatcherOptions {
  onSkip?: (result: DispatchResult) => Promise<void> | void;
  onDispatch?: (message: QueueMessage) => Promise<void> | void;
  isCancelled?: () => boolean;
}

const shouldSkip = (status: PreSendStatusResult): boolean =>
  status.state === PreSendState.AlreadySent || status.state === PreSendState.AlreadyProcessing;

export const dispatchQueueSequentially = async (
  queue: QueueMessage[],
  handler: DispatchHandler,
  options: SendDispatcherOptions = {}
): Promise<DispatchResult[]> => {
  const results: DispatchResult[] = [];

  for (const message of queue) {
    if (options.isCancelled?.()) {
      break;
    }

    const status = await checkPreSendStatus(message.id);

    if (shouldSkip(status)) {
      const skipResult: DispatchResult = {
        message,
        skipped: true,
        reason: status.reason ?? 'Status check failed',
        status
      };
      await emitAnalyticsEvent('send_skip', {
        messageId: message.id,
        state: status.state,
        reason: skipResult.reason
      });
      await options.onSkip?.(skipResult);
      results.push(skipResult);
      continue;
    }

    await options.onDispatch?.(message);
    await handler(message);
    results.push({
      message,
      skipped: false,
      status
    });
  }

  return results;
};
