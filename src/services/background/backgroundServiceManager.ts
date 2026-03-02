import type { PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { backgroundServiceConfig } from '@/config/backgroundService';
import {
  createBackgroundTaskController,
  type BackgroundTaskController,
  type BackgroundTaskRunner
} from '@/services/background/backgroundTaskController';
import {
  createForegroundServiceController,
  type ForegroundServiceController
} from '@/services/background/foregroundServiceController';
import { tr } from '@/i18n/translate';

interface AppBridge {
  addListener(
    eventName: 'appStateChange',
    listenerFunc: (state: { isActive: boolean }) => void | Promise<void>
  ): Promise<PluginListenerHandle>;
}

export class BackgroundServiceManager {
  private appStateListener: PluginListenerHandle | null = null;
  private running = false;

  constructor(
    private readonly taskController: BackgroundTaskController,
    private readonly foregroundController: ForegroundServiceController,
    private readonly appBridge: AppBridge
  ) {}

  isRunning(): boolean {
    return this.running;
  }

  private foregroundNotificationOverrides() {
    return {
      channelName: tr('notifications.foreground.channelName'),
      channelDescription: tr('notifications.foreground.channelDescription'),
      title: tr('notifications.foreground.title'),
      body: tr('notifications.foreground.body')
    };
  }

  async start(runner?: BackgroundTaskRunner): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    if (this.foregroundController.isSupported()) {
      await this.foregroundController.start(this.foregroundNotificationOverrides());
    }

    if (this.taskController.isSupported()) {
      await this.taskController.register(runner);
    }

    this.appStateListener = await this.appBridge.addListener('appStateChange', async ({ isActive }) => {
      if (!this.running || !this.taskController.isSupported()) {
        return;
      }

      if (isActive) {
        await this.taskController.finish();
      } else {
        await this.taskController.register(runner);
        if (this.foregroundController.isSupported() && !this.foregroundController.isRunning()) {
          await this.foregroundController.start(this.foregroundNotificationOverrides());
        }
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    await this.appStateListener?.remove();
    this.appStateListener = null;

    if (this.taskController.isSupported()) {
      await this.taskController.finish();
    }

    if (this.foregroundController.isSupported()) {
      await this.foregroundController.stop();
    }
  }
}

export const createBackgroundServiceManager = () =>
  new BackgroundServiceManager(
    createBackgroundTaskController(),
    createForegroundServiceController(backgroundServiceConfig.android),
    App
  );

export const backgroundServiceManager = createBackgroundServiceManager();
