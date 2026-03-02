import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import { scheduleLocalNotification } from '@/services/notifications/localNotifications';
import type { SendStats } from '@/services/messages/backgroundSendController';
import { tr } from '@/i18n/translate';

const BACKGROUND_SEND_NOTIFICATION_ID = 6201;
const BACKGROUND_SEND_GROUP = 'gmast-background-send';
const TARGET_ROUTE = '/';

const baseNotification = (): Pick<LocalNotificationSchema, 'id' | 'group' | 'extra' | 'actionTypeId'> => ({
  id: BACKGROUND_SEND_NOTIFICATION_ID,
  group: BACKGROUND_SEND_GROUP,
  actionTypeId: undefined,
  extra: {
    targetRoute: TARGET_ROUTE,
    notificationKind: 'background-send'
  }
});

const formatProgressBody = (stats: SendStats): string => {
  if (!stats.total) {
    return tr('notifications.backgroundSend.waitingQueue');
  }

  const percent = Math.min(100, Math.round((stats.attempted / stats.total) * 100));
  return tr('notifications.backgroundSend.progressBody', {
    attempted: stats.attempted,
    total: stats.total,
    sent: stats.sent,
    skipped: stats.skipped,
    percent
  });
};

export const backgroundSendNotificationService = {
  async showStart(total: number): Promise<void> {
    await scheduleLocalNotification({
      ...baseNotification(),
      title: tr('notifications.backgroundSend.preparingTitle'),
      body: total > 0
        ? tr('notifications.backgroundSend.preparingBody', { total })
        : tr('notifications.backgroundSend.preparingEmptyBody'),
      sound: undefined,
      ongoing: true,
      autoCancel: false
    });
  },

  async updateProgress(stats: SendStats): Promise<void> {
    await scheduleLocalNotification({
      ...baseNotification(),
      title: stats.cancelled
        ? tr('notifications.backgroundSend.stoppingTitle')
        : tr('notifications.backgroundSend.runningTitle'),
      body: formatProgressBody(stats),
      sound: undefined,
      ongoing: true,
      autoCancel: false
    });
  },

  async showCompletion(stats: SendStats): Promise<void> {
    await scheduleLocalNotification({
      ...baseNotification(),
      title: stats.cancelled
        ? tr('notifications.backgroundSend.stoppedTitle')
        : tr('notifications.backgroundSend.completedTitle'),
      body: stats.total
        ? tr('notifications.backgroundSend.completedBody', {
            attempted: stats.attempted,
            total: stats.total,
            sent: stats.sent,
            skipped: stats.skipped
          })
        : tr('notifications.backgroundSend.emptyResultBody'),
      ongoing: false,
      autoCancel: true
    });
  },

  async showError(error: Error): Promise<void> {
    await scheduleLocalNotification({
      ...baseNotification(),
      title: tr('notifications.backgroundSend.errorTitle'),
      body: error.message ?? tr('notifications.backgroundSend.unknownError'),
      ongoing: false,
      autoCancel: true
    });
  }
};
