import { createI18n } from 'vue-i18n';
import en from '@/i18n/locales/en';
import ko from '@/i18n/locales/ko';
import { resolveInitialLocale } from '@/services/settings/languageService';
import type { AppLocale } from '@/i18n/types';

const messages = {
  en,
  ko
} as const;

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages
});

export const setupI18nLocale = async (): Promise<AppLocale> => {
  const locale = await resolveInitialLocale();
  i18n.global.locale.value = locale;
  return locale;
};

