import { i18n } from '@/i18n';

export const tr = (key: string, params?: Record<string, unknown>): string =>
  i18n.global.t(key, params);

