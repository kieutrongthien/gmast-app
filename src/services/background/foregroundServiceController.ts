import { Capacitor } from '@capacitor/core';
import {
  ForegroundService,
  type CreateNotificationChannelOptions,
  type StartForegroundServiceOptions,
  Importance
} from '@capawesome-team/capacitor-android-foreground-service';
import type { AndroidForegroundNotificationConfig } from '@/config/backgroundService';

export interface ForegroundServiceController {
  isSupported(): boolean;
  isRunning(): boolean;
  start(overrides?: Partial<AndroidForegroundNotificationConfig>): Promise<void>;
  stop(): Promise<void>;
}

const isAndroidPlatform = (): boolean => Capacitor.getPlatform() === 'android';

const resolveOptions = (
  config: AndroidForegroundNotificationConfig,
  overrides?: Partial<AndroidForegroundNotificationConfig>
): AndroidForegroundNotificationConfig => ({
  ...config,
  ...overrides
});

const buildStartOptions = (
  notification: AndroidForegroundNotificationConfig
): StartForegroundServiceOptions => ({
  id: notification.notificationId,
  title: notification.title,
  body: notification.body,
  smallIcon: notification.smallIcon,
  silent: notification.silent,
  notificationChannelId: notification.channelId
});

const buildChannelOptions = (
  notification: AndroidForegroundNotificationConfig
): CreateNotificationChannelOptions => ({
  id: notification.channelId,
  name: notification.channelName,
  description: notification.channelDescription,
  importance: notification.importance ?? Importance.Default
});

export const createForegroundServiceController = (
  config: AndroidForegroundNotificationConfig
): ForegroundServiceController => {
  let running = false;

  const ensureNotificationPermission = async () => {
    try {
      const { display } = await ForegroundService.checkPermissions();
      if (display === 'granted') {
        return;
      }

      const requested = await ForegroundService.requestPermissions();
      if (requested.display !== 'granted') {
        console.warn('[ForegroundService] notification permission rejected');
      }
    } catch (error) {
      console.warn('[ForegroundService] permission request failed', error);
    }
  };

  const ensureChannel = async (notification: AndroidForegroundNotificationConfig) => {
    try {
      await ForegroundService.createNotificationChannel(buildChannelOptions(notification));
    } catch (error) {
      console.warn('[ForegroundService] createNotificationChannel failed', error);
    }
  };

  return {
    isSupported: isAndroidPlatform,
    isRunning: () => running,
    async start(overrides?: Partial<AndroidForegroundNotificationConfig>) {
      if (!isAndroidPlatform() || running) {
        return;
      }

      const notification = resolveOptions(config, overrides);
      await ensureNotificationPermission();
      await ensureChannel(notification);

      try {
        await ForegroundService.startForegroundService(buildStartOptions(notification));
        running = true;
      } catch (error) {
        console.warn('[ForegroundService] start failed', error);
      }
    },
    async stop() {
      if (!isAndroidPlatform() || !running) {
        return;
      }

      try {
        await ForegroundService.stopForegroundService();
      } catch (error) {
        console.warn('[ForegroundService] stop failed', error);
      } finally {
        running = false;
      }
    }
  };
};
