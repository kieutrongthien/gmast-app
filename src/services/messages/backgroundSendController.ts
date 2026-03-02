import { ref, computed } from 'vue';
import type { QueueMessage } from '@/types/queue';
import {
  dispatchQueueSequentially,
  type DispatchHandler,
  type DispatchResult,
  type SendDispatcherOptions
} from '@/services/messages/sendDispatcher';
import { fetchFullPendingQueue } from '@/services/messages/pendingMessageClient';
import type { QueueSnapshot } from '@/types/queue';
import { backgroundServiceManager, type BackgroundServiceManager } from '@/services/background';
import { emitAnalyticsEvent, type AnalyticsPayload } from '@/services/messages/analytics';
import { backgroundSendNotificationService } from '@/services/notifications/backgroundSendNotificationService';

export interface SendStats extends Record<string, number | boolean> {
  total: number;
  attempted: number;
  sent: number;
  skipped: number;
  cancelled: boolean;
}

const defaultStats: SendStats = {
  total: 0,
  attempted: 0,
  sent: 0,
  skipped: 0,
  cancelled: false
};

const runningState = ref(false);
const statsState = ref<SendStats>({ ...defaultStats });
const errorState = ref<Error | null>(null);

export interface BackgroundSendCallbacks {
  onDispatch?: SendDispatcherOptions['onDispatch'];
  onSkip?: SendDispatcherOptions['onSkip'];
  onComplete?: (results: DispatchResult[], cancelled: boolean) => Promise<void> | void;
  onError?: (error: Error) => Promise<void> | void;
}

export interface StartBackgroundSendOptions extends BackgroundSendCallbacks {
  queue?: QueueMessage[];
  loadQueue?: () => Promise<QueueMessage[]>;
  handler: DispatchHandler;
}

const summarizeResults = (results: DispatchResult[], total: number, cancelled: boolean): SendStats => {
  const skipped = results.filter((result) => result.skipped).length;
  const attempted = results.length;
  const sent = attempted - skipped;
  return {
    total,
    attempted,
    sent,
    skipped,
    cancelled
  };
};

const notifyStart = async (total: number) => {
  await backgroundSendNotificationService.showStart(total);
};

const notifyCompletion = async (stats: SendStats) => {
  await backgroundSendNotificationService.showCompletion(stats);
};

const notifyProgress = async (stats: SendStats) => {
  await backgroundSendNotificationService.updateProgress(stats);
};

const notifyError = async (error: Error) => {
  await backgroundSendNotificationService.showError(error);
};

interface BackgroundSendDependencies {
  fetchQueue: () => Promise<QueueSnapshot>;
  serviceManager: BackgroundServiceManager;
  notifyStart: (total: number) => Promise<void>;
  notifyProgress: (stats: SendStats) => Promise<void>;
  notifyCompletion: (stats: SendStats) => Promise<void>;
  notifyError: (error: Error) => Promise<void>;
  analytics: (event: string, payload?: AnalyticsPayload) => Promise<void> | void;
}

const defaultDependencies: BackgroundSendDependencies = {
  fetchQueue: () => fetchFullPendingQueue({ persist: false }),
  serviceManager: backgroundServiceManager,
  notifyStart,
  notifyProgress,
  notifyCompletion,
  notifyError,
  analytics: emitAnalyticsEvent
};

export class BackgroundSendController {
  private stopRequested = false;
  private loopPromise: Promise<void> | null = null;
  private serviceActive = false;

  constructor(private readonly deps: BackgroundSendDependencies = defaultDependencies) {}

  readonly state = {
    running: computed(() => runningState.value),
    stats: computed(() => statsState.value),
    error: computed(() => errorState.value)
  };

  isRunning(): boolean {
    return runningState.value;
  }

  private async ensureServiceStarted(runner?: () => Promise<void> | void): Promise<void> {
    if (this.serviceActive) {
      return;
    }
    await this.deps.serviceManager.start(runner);
    this.serviceActive = true;
  }

  private async ensureServiceStopped(): Promise<void> {
    if (!this.serviceActive) {
      return;
    }
    await this.deps.serviceManager.stop();
    this.serviceActive = false;
  }

  async start(options: StartBackgroundSendOptions): Promise<void> {
    if (this.loopPromise) {
      throw new Error('Background send already running');
    }

    const queue = options.queue
      ?? (options.loadQueue ? await options.loadQueue() : (await this.deps.fetchQueue()).messages);

    runningState.value = true;
    statsState.value = {
      ...defaultStats,
      total: queue.length
    };
    errorState.value = null;
    this.stopRequested = false;

    let attempted = 0;
    let sent = 0;
    let skipped = 0;

    const trackProgress = async (result: DispatchResult) => {
      attempted += 1;
      if (result.skipped) {
        skipped += 1;
      } else {
        sent += 1;
      }

      const snapshot: SendStats = {
        ...statsState.value,
        attempted,
        sent,
        skipped,
        cancelled: this.stopRequested
      };
      statsState.value = snapshot;
    };

    const dispatcherOptions: SendDispatcherOptions = {
      onDispatch: options.onDispatch,
      onSkip: options.onSkip,
      onResult: trackProgress,
      isCancelled: () => this.stopRequested
    };

    this.loopPromise = Promise.resolve();
    const runner = async () => {
      if (this.loopPromise) {
        await this.loopPromise;
      }
    };

    await this.ensureServiceStarted(runner);
    await this.deps.notifyStart(queue.length);
    await this.deps.analytics('background_send_start', { total: queue.length });

    const loop = this.runDispatchLoop(queue, options.handler, dispatcherOptions, options);

    this.loopPromise = loop.finally(async () => {
      await this.ensureServiceStopped();
      runningState.value = false;
      this.loopPromise = null;
      this.stopRequested = false;
    });
  }

  private async runDispatchLoop(
    queue: QueueMessage[],
    handler: DispatchHandler,
    dispatcherOptions: SendDispatcherOptions,
    callbacks: BackgroundSendCallbacks
  ): Promise<void> {
    if (queue.length === 0) {
      const summary = summarizeResults([], 0, false);
      statsState.value = summary;
      await this.deps.notifyCompletion(summary);
      await this.deps.analytics('background_send_empty', {});
      return;
    }

    try {
      const results = await dispatchQueueSequentially(queue, handler, dispatcherOptions);
      const summary = summarizeResults(results, queue.length, this.stopRequested);
      statsState.value = summary;
      await callbacks.onComplete?.(results, this.stopRequested);
      await this.deps.notifyCompletion(summary);
      await this.deps.analytics('background_send_complete', summary);
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      errorState.value = normalized;
      await callbacks.onError?.(normalized);
      await this.deps.notifyError(normalized);
      await this.deps.analytics('background_send_error', {
        message: normalized.message,
        cancelled: this.stopRequested
      });
      throw normalized;
    }
  }

  async stop(): Promise<void> {
    if (!this.loopPromise) {
      await this.ensureServiceStopped();
      runningState.value = false;
      statsState.value = { ...statsState.value, cancelled: true };
      return;
    }

    this.stopRequested = true;
    try {
      await this.loopPromise;
    } catch (_error) {
      // error already handled in runDispatchLoop
    } finally {
      await this.ensureServiceStopped();
      runningState.value = false;
    }
  }

  async waitForIdle(): Promise<void> {
    await this.loopPromise;
  }
}

export const backgroundSendController = new BackgroundSendController();
