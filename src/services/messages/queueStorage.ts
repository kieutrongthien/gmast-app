import { Preferences } from '@capacitor/preferences';
import { appConfig } from '@/config/appConfig';
import type { QueueSnapshot } from '@/types/queue';

const STORAGE_KEY = appConfig.queue.cacheKey;

export const saveQueueSnapshot = async (snapshot: QueueSnapshot): Promise<void> => {
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(snapshot) });
};

export const loadQueueSnapshot = async (): Promise<QueueSnapshot | null> => {
  const stored = await Preferences.get({ key: STORAGE_KEY });
  if (!stored.value) {
    return null;
  }

  try {
    return JSON.parse(stored.value) as QueueSnapshot;
  } catch (_error) {
    return null;
  }
};

export const clearQueueSnapshot = async (): Promise<void> => {
  await Preferences.remove({ key: STORAGE_KEY });
};
