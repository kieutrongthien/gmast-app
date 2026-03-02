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
    channelId: "gmast-send-channel",
    channelName: "백그라운드 메시지 전송",
    channelDescription:
      "앱이 백그라운드일 때도 GMAST 전송을 유지합니다.",
    title: "GMAST 메시지 전송 중",
    body: "화면이 잠겨 있어도 메시지 전송이 계속됩니다.",
    smallIcon: "ic_stat_gmast_background",
    silent: true,
    importance: Importance.Default,
  },
  backgroundTask: {
    enabled: true,
  },
};
