import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import { scheduleLocalNotification } from '@/services/notifications/localNotifications';
import type { SendStats } from '@/services/messages/backgroundSendController';

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
    return 'Đang chờ hàng đợi...';
  }

  const percent = Math.min(100, Math.round((stats.attempted / stats.total) * 100));
  return `Đã xử lý ${stats.attempted}/${stats.total} tin · ${stats.sent} thành công · ${stats.skipped} bỏ qua · ${percent}%`;
};

export const backgroundSendNotificationService = {
  async showStart(total: number): Promise<void> {
    await scheduleLocalNotification({
      ...baseNotification(),
      title: 'Đang chuẩn bị gửi nền',
      body: total > 0 ? `Đang chuẩn bị ${total} tin nhắn...` : 'Không có tin nhắn nào trong hàng chờ.',
      ongoing: true,
      autoCancel: false
    });
  },

  async updateProgress(stats: SendStats): Promise<void> {
    await scheduleLocalNotification({
      ...baseNotification(),
      title: stats.cancelled ? 'Đang dừng gửi nền' : 'Gửi nền đang chạy',
      body: formatProgressBody(stats),
      ongoing: true,
      autoCancel: false
    });
  },

  async showCompletion(stats: SendStats): Promise<void> {
    await scheduleLocalNotification({
      ...baseNotification(),
      title: stats.cancelled ? 'Đã dừng gửi nền' : 'Hoàn tất gửi nền',
      body: stats.total
        ? `Gửi ${stats.attempted}/${stats.total} tin · Thành công ${stats.sent}, bỏ qua ${stats.skipped}.`
        : 'Không có tin nào để xử lý.',
      ongoing: false,
      autoCancel: true
    });
  },

  async showError(error: Error): Promise<void> {
    await scheduleLocalNotification({
      ...baseNotification(),
      title: 'Gửi nền gặp lỗi',
      body: error.message ?? 'Không xác định được lỗi.',
      ongoing: false,
      autoCancel: true
    });
  }
};
