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
  onResult?: (result: DispatchResult) => Promise<void> | void;
  isCancelled?: () => boolean;
  minDelayMs?: number;
  maxDelayMs?: number;
}

const shouldSkip = (status: PreSendStatusResult): boolean =>
  status.state === PreSendState.AlreadySent || status.state === PreSendState.AlreadyProcessing;

const DEFAULT_MIN_DELAY_MS = 3000;
const DEFAULT_MAX_DELAY_MS = 5000;

const isTestMode = (): boolean => {
  try {
    return (import.meta.env?.MODE ?? '').toLowerCase() === 'test';
  } catch (_error) {
    return false;
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const randomBetween = (min: number, max: number): number => {
  const safeMin = Math.max(0, Math.trunc(min));
  const safeMax = Math.max(safeMin, Math.trunc(max));
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
};

export const dispatchQueueSequentially = async (
  queue: QueueMessage[],
  handler: DispatchHandler,
  options: SendDispatcherOptions = {}
): Promise<DispatchResult[]> => {
  const results: DispatchResult[] = [];
  const minDelayMs = options.minDelayMs ?? DEFAULT_MIN_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

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
      await options.onResult?.(skipResult);
      continue;
    }

    await options.onDispatch?.(message);
    await handler(message);
    const successResult: DispatchResult = {
      message,
      skipped: false,
      status
    };
    results.push(successResult);
    await options.onResult?.(successResult);

    if (!isTestMode()) {
      const waitMs = randomBetween(minDelayMs, maxDelayMs);
      await sleep(waitMs);
    }
  }

  return results;
};
