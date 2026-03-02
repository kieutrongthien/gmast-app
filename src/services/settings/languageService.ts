import { Preferences } from '@capacitor/preferences';
import type { AppLocale } from '@/i18n/types';

const LOCALE_KEY = 'gmast::locale';

const isAppLocale = (value: string): value is AppLocale => value === 'en' || value === 'ko';

const deviceLocale = (): string => {
  if (typeof navigator === 'undefined') {
    return 'en';
  }
  return navigator.language || 'en';
};

const localeFromDevice = (): AppLocale => {
  const current = deviceLocale().toLowerCase();
  return current.startsWith('ko') ? 'ko' : 'en';
};

export const getSavedLocale = async (): Promise<AppLocale | null> => {
  const stored = await Preferences.get({ key: LOCALE_KEY });
  if (!stored.value) {
    return null;
  }
  return isAppLocale(stored.value) ? stored.value : null;
};

export const setSavedLocale = async (locale: AppLocale): Promise<void> => {
  await Preferences.set({ key: LOCALE_KEY, value: locale });
};

export const resolveInitialLocale = async (): Promise<AppLocale> => {
  const saved = await getSavedLocale();
  if (saved) {
    return saved;
  }
  return localeFromDevice();
};

