import { Capacitor } from '@capacitor/core';
import { ensureLocalNotificationPermission } from '@/services/notifications/localNotifications';
import { ensureSimReadPermission } from '@/services/sim/simMetadataService';
import { ensureSmsSendPermission } from '@/services/permissions/smsSendPermissionService';

const isAndroidNative = (): boolean => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export interface StartupPermissionDebugSnapshot {
  simPermission: string;
  smsPermission: string;
  notificationPermission: string;
  summary: string;
}

let lastStartupPermissionDebug: StartupPermissionDebugSnapshot = {
  simPermission: 'not-checked',
  smsPermission: 'not-checked',
  notificationPermission: 'not-checked',
  summary: 'SIM: not-checked · SMS: not-checked · Notification: not-checked'
};

export const getStartupPermissionDebugSnapshot = (): StartupPermissionDebugSnapshot =>
  lastStartupPermissionDebug;

export const ensureStartupPermissions = async (): Promise<boolean> => {
  if (!isAndroidNative()) {
    lastStartupPermissionDebug = {
      simPermission: 'skipped-non-android',
      smsPermission: 'skipped-non-android',
      notificationPermission: 'skipped-non-android',
      summary: 'SIM: skipped-non-android · SMS: skipped-non-android · Notification: skipped-non-android'
    };

    return true;
  }

  try {
    const simPermission = await ensureSimReadPermission();
    const smsPermission = await ensureSmsSendPermission();
    const notificationPermission = await ensureLocalNotificationPermission();

    lastStartupPermissionDebug = {
      simPermission,
      smsPermission,
      notificationPermission: notificationPermission ? 'granted' : 'denied',
      summary: `SIM: ${simPermission} · SMS: ${smsPermission} · Notification: ${notificationPermission ? 'granted' : 'denied'}`
    };

    return simPermission === 'granted' && smsPermission === 'granted' && notificationPermission;
  } catch (error) {
    console.warn('[StartupPermission] unable to verify startup permissions', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    lastStartupPermissionDebug = {
      simPermission: 'error',
      smsPermission: 'error',
      notificationPermission: 'error',
      summary: `SIM: error · SMS: error · Notification: error · ${errorMessage}`
    };

    return false;
  }
};
