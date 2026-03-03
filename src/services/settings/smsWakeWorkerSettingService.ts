import { Preferences } from '@capacitor/preferences';

export const SMS_WAKE_WORKER_ENABLED_KEY = 'gmast::sms-wake-worker-enabled';

const toBoolean = (value: string | null): boolean => {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1'
    || normalized === 'true'
    || normalized === 'yes'
    || normalized === 'on';
};

export const getSmsWakeWorkerEnabled = async (): Promise<boolean> => {
  const result = await Preferences.get({ key: SMS_WAKE_WORKER_ENABLED_KEY });
  return toBoolean(result.value);
};

export const setSmsWakeWorkerEnabled = async (enabled: boolean): Promise<void> => {
  await Preferences.set({
    key: SMS_WAKE_WORKER_ENABLED_KEY,
    value: enabled ? 'true' : 'false'
  });
};
