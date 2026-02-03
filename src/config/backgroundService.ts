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
    channelName: 'Gửi tin nhắn nền',
    channelDescription: 'Giữ tiến trình gửi GMAST hoạt động khi ứng dụng thu nhỏ',
    title: 'GMAST đang gửi tin nhắn',
    body: 'Tin nhắn sẽ tiếp tục gửi ngay cả khi bạn khóa màn hình.',
    smallIcon: 'ic_stat_gmast_background',
    silent: true,
    importance: Importance.Default
  },
  backgroundTask: {
    enabled: true
  }
};
