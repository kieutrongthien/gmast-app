import { Capacitor } from '@capacitor/core';
import { ensureLocalNotificationPermission } from '@/services/notifications/localNotifications';
import { ensureSimReadPermission } from '@/services/sim/simMetadataService';

const isAndroidNative = (): boolean => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const ensureStartupPermissions = async (): Promise<boolean> => {
  if (!isAndroidNative()) {
    return true;
  }

  try {
    const [simPermission, notificationPermission] = await Promise.all([
      ensureSimReadPermission(),
      ensureLocalNotificationPermission()
    ]);

    return simPermission === 'granted' && notificationPermission;
  } catch (error) {
    console.warn('[StartupPermission] unable to verify startup permissions', error);
    return false;
  }
};
