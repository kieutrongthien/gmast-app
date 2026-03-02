import { Capacitor, registerPlugin, type PermissionState } from '@capacitor/core';

interface SmsPermissionStatus {
  sendSms?: PermissionState;
}

interface SmsPermissionPlugin {
  checkPermissions(): Promise<SmsPermissionStatus>;
  requestPermissions(): Promise<SmsPermissionStatus>;
  openAppSettings(): Promise<void>;
}

const SmsPermission = registerPlugin<SmsPermissionPlugin>('SmsPermission');

const isAndroidNative = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const normalizeState = (value: PermissionState | undefined): PermissionState => {
  if (
    value === 'granted' ||
    value === 'denied' ||
    value === 'prompt' ||
    value === 'prompt-with-rationale'
  ) {
    return value;
  }

  return 'denied';
};

export const ensureSmsSendPermission = async (): Promise<PermissionState> => {
  if (!isAndroidNative()) {
    return 'granted';
  }

  try {
    const current = await SmsPermission.checkPermissions();
    const currentState = normalizeState(current.sendSms);

    if (currentState === 'granted') {
      return currentState;
    }

    const requested = await SmsPermission.requestPermissions();
    return normalizeState(requested.sendSms);
  } catch (error) {
    console.warn('[SmsPermission] unable to verify SEND_SMS permission', error);
    return 'denied';
  }
};

export const openSmsPermissionSettings = async (): Promise<void> => {
  if (!isAndroidNative()) {
    return;
  }

  try {
    await SmsPermission.openAppSettings();
  } catch (error) {
    console.warn('[SmsPermission] unable to open app settings', error);
  }
};
