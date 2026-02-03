import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/messages/sendDispatcher', () => ({
  dispatchQueueSequentially: vi.fn()
}));

import { dispatchQueueSequentially } from '@/services/messages/sendDispatcher';
import { BackgroundSendController } from '@/services/messages/backgroundSendController';
import type { QueueMessage } from '@/types/queue';

const mockedDispatcher = vi.mocked(dispatchQueueSequentially);

const sampleMessage = (id: string): QueueMessage => ({
  id,
  to: '+84123456789',
  body: 'Xin chào',
  mediaUrls: [],
  channel: 'sms',
  priority: 'normal',
  status: 'pending',
  scheduledAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  retryCount: 0,
  tags: [],
  metadata: {},
  dedupeKey: null
});

describe('BackgroundSendController', () => {
  const queue = [sampleMessage('1'), sampleMessage('2')];

  const createDeps = () => {
    const fetchQueue = vi.fn(async () => ({
      messages: queue,
      meta: {
        page: 1,
        pageSize: queue.length,
        totalItems: queue.length,
        totalPages: 1,
        hasNextPage: false,
        fetchedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    }));

    const serviceManager = {
      start: vi.fn(async () => {}),
      stop: vi.fn(async () => {}),
      isRunning: () => false
    } as any;

    const notifyStart = vi.fn(async () => {});
    const notifyProgress = vi.fn(async () => {});
    const notifyCompletion = vi.fn(async () => {});
    const notifyError = vi.fn(async () => {});
    const analytics = vi.fn(async () => {});

    return {
      fetchQueue,
      serviceManager,
      notifyStart,
      notifyProgress,
      notifyCompletion,
      notifyError,
      analytics
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts dispatch loop and reports completion', async () => {
    mockedDispatcher.mockImplementationOnce(async (_queue, _handler, options) => {
      const results = [
        { message: queue[0], skipped: false },
        { message: queue[1], skipped: true }
      ];
      for (const result of results) {
        await options?.onResult?.(result as any);
      }
      return results as any;
    });

    const deps = createDeps();
    const controller = new BackgroundSendController(deps as any);
    const handler = vi.fn(async () => {});
    const onComplete = vi.fn(async () => {});

    await controller.start({ handler, onComplete });
    await controller.waitForIdle();

    expect(deps.serviceManager.start).toHaveBeenCalled();
    expect(deps.notifyStart).toHaveBeenCalledWith(queue.length);
    expect(mockedDispatcher).toHaveBeenCalledWith(queue, handler, expect.objectContaining({
      isCancelled: expect.any(Function)
    }));
    expect(onComplete).toHaveBeenCalledWith(expect.any(Array), false);
    expect(deps.notifyProgress).toHaveBeenCalledTimes(2);
    expect(deps.notifyCompletion).toHaveBeenCalled();
    expect(deps.analytics).toHaveBeenCalledWith('background_send_complete', expect.objectContaining({
      total: queue.length,
      sent: 1,
      skipped: 1
    }));
  });

  it('marks cancellation when stop requested', async () => {
    let resolveDispatch: ((value: any) => void) | null = null;
    mockedDispatcher.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDispatch = resolve;
        })
    );

    const deps = createDeps();
    const controller = new BackgroundSendController(deps as any);
    const handler = vi.fn(async () => {});

    await controller.start({ handler });
    const dispatcherOptions = mockedDispatcher.mock.calls[0][2];
    expect(dispatcherOptions?.isCancelled?.()).toBe(false);

    const stopPromise = controller.stop();

    expect(dispatcherOptions?.isCancelled?.()).toBe(true);

    resolveDispatch?.(queue.map((item) => ({ message: item, skipped: false })));
    await stopPromise;

    expect(deps.serviceManager.stop).toHaveBeenCalled();
    expect(controller.state.stats.value.cancelled).toBe(true);
  });
});
