import {
  LocalNotifications,
  type LocalNotificationSchema,
  type PermissionStatus
} from '@capacitor/local-notifications';

let permissionGranted = false;
let permissionChecked = false;
let nextNotificationId = 6000;

const grantFromStatus = (status: PermissionStatus | undefined): boolean =>
  (status?.display ?? 'prompt') === 'granted';

export const ensureLocalNotificationPermission = async (): Promise<boolean> => {
  if (permissionChecked && permissionGranted) {
    return true;
  }

  try {
    const status = await LocalNotifications.checkPermissions();
    permissionGranted = grantFromStatus(status);
    permissionChecked = true;

    if (!permissionGranted) {
      const requested = await LocalNotifications.requestPermissions();
      permissionGranted = grantFromStatus(requested);
    }
  } catch (error) {
    console.warn('[Notifications] permission check failed', error);
    permissionGranted = false;
  }

  return permissionGranted;
};

interface ScheduleOptions extends Partial<LocalNotificationSchema> {
  title: string;
  body: string;
}

export const scheduleLocalNotification = async (notification: ScheduleOptions): Promise<boolean> => {
  const granted = await ensureLocalNotificationPermission();
  if (!granted) {
    return false;
  }

  const payload: LocalNotificationSchema = {
    id: notification.id ?? nextNotificationId++,
    title: notification.title,
    body: notification.body,
    schedule: notification.schedule,
    extra: notification.extra,
    attachments: notification.attachments,
    actionTypeId: notification.actionTypeId,
    sound: notification.sound,
    smallIcon: notification.smallIcon,
    largeIcon: notification.largeIcon,
    iconColor: notification.iconColor,
    autoCancel: notification.autoCancel ?? true,
    ongoing: notification.ongoing ?? false
  };

  try {
    await LocalNotifications.schedule({ notifications: [payload] });
    return true;
  } catch (error) {
    console.warn('[Notifications] schedule failed', error);
    return false;
  }
};
