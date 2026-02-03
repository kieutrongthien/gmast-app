import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackgroundServiceManager } from '@/services/background/backgroundServiceManager';
import type { BackgroundTaskController } from '@/services/background/backgroundTaskController';
import type { ForegroundServiceController } from '@/services/background/foregroundServiceController';

const createTaskControllerMock = (): BackgroundTaskController => ({
  isSupported: vi.fn(() => true),
  register: vi.fn(async () => 1),
  finish: vi.fn(async () => {})
});

const createForegroundControllerMock = (): ForegroundServiceController => ({
  isSupported: vi.fn(() => true),
  isRunning: vi.fn(() => false),
  start: vi.fn(async () => {}),
  stop: vi.fn(async () => {})
});

const createAppBridgeMock = () => {
  const remove = vi.fn(async () => {});
  const handlerRef: { fn?: (state: { isActive: boolean }) => void | Promise<void> } = {};

  return {
    handlerRef,
    addListener: vi.fn(async (_event, handler) => {
      handlerRef.fn = handler;
      return { remove };
    })
  };
};

describe('BackgroundServiceManager', () => {
  let taskController: BackgroundTaskController;
  let foregroundController: ForegroundServiceController;
  let appBridge: ReturnType<typeof createAppBridgeMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    taskController = createTaskControllerMock();
    foregroundController = createForegroundControllerMock();
    appBridge = createAppBridgeMock();
  });

  it('starts controllers and registers listener once', async () => {
    const manager = new BackgroundServiceManager(taskController, foregroundController, appBridge as any);

    await manager.start();
    await manager.start();

    expect(foregroundController.start).toHaveBeenCalledTimes(1);
    expect(taskController.register).toHaveBeenCalledTimes(1);
    expect(appBridge.addListener).toHaveBeenCalledTimes(1);
    expect(manager.isRunning()).toBe(true);
  });

  it('handles app state transitions', async () => {
    const manager = new BackgroundServiceManager(taskController, foregroundController, appBridge as any);
    await manager.start();

    await appBridge.handlerRef.fn?.({ isActive: false });
    expect(taskController.register).toHaveBeenCalledTimes(2);
    expect(foregroundController.start).toHaveBeenCalledTimes(2);

    await appBridge.handlerRef.fn?.({ isActive: true });
    expect(taskController.finish).toHaveBeenCalledTimes(1);
  });

  it('stops controllers and removes listener', async () => {
    const manager = new BackgroundServiceManager(taskController, foregroundController, appBridge as any);
    await manager.start();
    const listenerHandle = await appBridge.addListener.mock.results[0]?.value;

    await manager.stop();

    expect(taskController.finish).toHaveBeenCalledTimes(1);
    expect(foregroundController.stop).toHaveBeenCalledTimes(1);
    expect(listenerHandle?.remove).toHaveBeenCalledTimes(1);
    expect(manager.isRunning()).toBe(false);
  });
});
