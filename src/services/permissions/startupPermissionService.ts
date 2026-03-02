import { Capacitor } from '@capacitor/core';
import { ensureLocalNotificationPermission } from '@/services/notifications/localNotifications';
import { ensureSimReadPermission } from '@/services/sim/simMetadataService';

const isAndroidNative = (): boolean => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export interface StartupPermissionDebugSnapshot {
  simPermission: string;
  notificationPermission: string;
  summary: string;
}

let lastStartupPermissionDebug: StartupPermissionDebugSnapshot = {
  simPermission: 'not-checked',
  notificationPermission: 'not-checked',
  summary: 'SIM: not-checked · Notification: not-checked'
};

export const getStartupPermissionDebugSnapshot = (): StartupPermissionDebugSnapshot =>
  lastStartupPermissionDebug;

export const ensureStartupPermissions = async (): Promise<boolean> => {
  if (!isAndroidNative()) {
    lastStartupPermissionDebug = {
      simPermission: 'skipped-non-android',
      notificationPermission: 'skipped-non-android',
      summary: 'SIM: skipped-non-android · Notification: skipped-non-android'
    };

    return true;
  }

  try {
    const simPermission = await ensureSimReadPermission();
    const notificationPermission = await ensureLocalNotificationPermission();

    lastStartupPermissionDebug = {
      simPermission,
      notificationPermission: notificationPermission ? 'granted' : 'denied',
      summary: `SIM: ${simPermission} · Notification: ${notificationPermission ? 'granted' : 'denied'}`
    };

    return simPermission === 'granted' && notificationPermission;
  } catch (error) {
    console.warn('[StartupPermission] unable to verify startup permissions', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    lastStartupPermissionDebug = {
      simPermission: 'error',
      notificationPermission: 'error',
      summary: `SIM: error · Notification: error · ${errorMessage}`
    };

    return false;
  }
};
