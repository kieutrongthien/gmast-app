import { appConfig } from '@/config/appConfig';

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  multiplier?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = appConfig.queue.retry.attempts,
    baseDelayMs = appConfig.queue.retry.baseDelayMs,
    multiplier = appConfig.queue.retry.multiplier
  } = options;

  let attempt = 0;
  let delay = baseDelayMs;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      await sleep(delay);
      delay *= multiplier;
      attempt += 1;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Retry attempts exhausted without receiving an Error instance');
}
