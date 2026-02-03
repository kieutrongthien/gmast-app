import { Preferences } from '@capacitor/preferences';
import { appConfig } from '@/config/appConfig';
import type { SendConfig, SimSelectionMode } from '@/types/send';

const STORAGE_KEY = appConfig.send.preferenceKey;

const defaultConfig: SendConfig = {
  simMode: 'random',
  simSlotId: null
};

type ConfigListener = (config: SendConfig) => void;

const listeners = new Set<ConfigListener>();
let cachedConfig: SendConfig | null = null;

const sanitizeMode = (mode: unknown): SimSelectionMode => (mode === 'manual' ? 'manual' : 'random');

const sanitizeSlotId = (slotId: unknown): string | null => {
  if (typeof slotId !== 'string') {
    return null;
  }
  const trimmed = slotId.trim();
  return trimmed.length ? trimmed : null;
};

const sanitizeConfig = (value: Partial<SendConfig> | null | undefined): SendConfig => ({
  simMode: sanitizeMode(value?.simMode),
  simSlotId: sanitizeSlotId(value?.simSlotId)
});

const emit = (config: SendConfig) => {
  listeners.forEach((listener) => {
    try {
      listener(config);
    } catch (error) {
      console.warn('[sendConfig] listener error', error);
    }
  });
};

const persist = async (config: SendConfig): Promise<SendConfig> => {
  cachedConfig = config;
  if (!STORAGE_KEY) {
    return config;
  }

  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(config) });
  emit(config);
  return config;
};

export const getSendConfig = async (): Promise<SendConfig> => {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!STORAGE_KEY) {
    cachedConfig = { ...defaultConfig };
    return cachedConfig;
  }

  const stored = await Preferences.get({ key: STORAGE_KEY });
  if (!stored.value) {
    cachedConfig = { ...defaultConfig };
    return cachedConfig;
  }

  try {
    const parsed = JSON.parse(stored.value) as Partial<SendConfig>;
    cachedConfig = sanitizeConfig(parsed);
  } catch (_error) {
    cachedConfig = { ...defaultConfig };
  }

  return cachedConfig;
};

export const saveSendConfig = async (config: SendConfig): Promise<SendConfig> => {
  const sanitized = sanitizeConfig(config);
  return persist(sanitized);
};

export const updateSendConfig = async (patch: Partial<SendConfig>): Promise<SendConfig> => {
  const current = await getSendConfig();
  const next: SendConfig = sanitizeConfig({ ...current, ...patch });
  return persist(next);
};

export const resetSendConfig = async (): Promise<void> => {
  cachedConfig = { ...defaultConfig };
  if (!STORAGE_KEY) {
    return;
  }
  await Preferences.remove({ key: STORAGE_KEY });
  emit(cachedConfig);
};

export const subscribeToSendConfig = (listener: ConfigListener): (() => void) => {
  listeners.add(listener);
  if (cachedConfig) {
    listener(cachedConfig);
  }
  return () => {
    listeners.delete(listener);
  };
};

export const getDefaultSendConfig = (): SendConfig => ({ ...defaultConfig });
