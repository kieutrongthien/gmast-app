import { Capacitor } from '@capacitor/core';
import { BackgroundTask } from '@capawesome/capacitor-background-task';

export type BackgroundTaskRunner = () => Promise<void> | void;

type BackgroundTaskId = string | null;

export interface BackgroundTaskController {
  isSupported(): boolean;
  register(runner?: BackgroundTaskRunner): Promise<BackgroundTaskId>;
  finish(): Promise<void>;
}

const isNativeBackgroundPlatform = (): boolean => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios';
};

export const createBackgroundTaskController = (): BackgroundTaskController => {
  let taskId: BackgroundTaskId = null;

  const finishCurrentTask = async () => {
    if (taskId === null) {
      return;
    }

    const current = taskId;
    taskId = null;

    try {
      await BackgroundTask.finish({ taskId: current });
    } catch (error) {
      console.warn('[BackgroundTask] finish failed', error);
    }
  };

  return {
    isSupported: isNativeBackgroundPlatform,
    async register(runner?: BackgroundTaskRunner): Promise<BackgroundTaskId> {
      if (!isNativeBackgroundPlatform()) {
        return null;
      }

      if (taskId !== null) {
        return taskId;
      }

      try {
        taskId = await BackgroundTask.beforeExit(async () => {
          try {
            await runner?.();
          } finally {
            await finishCurrentTask();
          }
        });
        return taskId;
      } catch (error) {
        console.warn('[BackgroundTask] registration failed', error);
        taskId = null;
        return null;
      }
    },
    async finish(): Promise<void> {
      await finishCurrentTask();
    }
  };
};
