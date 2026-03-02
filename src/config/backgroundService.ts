import { Importance } from '@capawesome-team/capacitor-android-foreground-service';

export interface AndroidForegroundNotificationConfig {
  notificationId: number;
  channelId: string;
  channelName: string;
  channelDescription?: string;
  title: string;
  body: string;
  smallIcon: string;
  silent?: boolean;
  importance?: Importance;
}

export interface BackgroundTaskConfig {
  enabled: boolean;
}

export interface BackgroundServiceConfig {
  android: AndroidForegroundNotificationConfig;
  backgroundTask: BackgroundTaskConfig;
}

export const backgroundServiceConfig: BackgroundServiceConfig = {
  android: {
    notificationId: 7021,
    channelId: 'gmast-send-channel',
    channelName: 'Background Message Sending',
    channelDescription: 'Keep GMAST sending active when the app is in the background',
    title: 'GMAST is sending messages',
    body: 'Message sending continues even while your screen is locked.',
    smallIcon: 'ic_stat_gmast_background',
    silent: true,
    importance: Importance.Default
  },
  backgroundTask: {
    enabled: true
  }
};
