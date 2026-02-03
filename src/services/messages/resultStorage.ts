import { Preferences } from '@capacitor/preferences';
import { appConfig } from '@/config/appConfig';
import type { DeliveryResultPayload } from '@/types/messageResult';

export interface FailedResultEntry {
  messageId: string;
  payload: DeliveryResultPayload;
  storedAt: string;
  failureReason?: string;
  attempts: number;
}

const STORAGE_KEY = appConfig.results.cacheKey;

const readEntries = async (): Promise<FailedResultEntry[]> => {
  const stored = await Preferences.get({ key: STORAGE_KEY });
  if (!stored.value) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored.value) as FailedResultEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (_error) {
    return [];
  }
};

const writeEntries = async (entries: FailedResultEntry[]): Promise<void> => {
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(entries) });
};

export const loadFailedResults = async (): Promise<FailedResultEntry[]> => {
  return readEntries();
};

export const upsertFailedResult = async (
  payload: DeliveryResultPayload,
  failureReason?: string
): Promise<FailedResultEntry[]> => {
  const current = await readEntries();
  const existing = current.find((entry) => entry.messageId === payload.messageId);

  const nextEntry: FailedResultEntry = {
    messageId: payload.messageId,
    payload,
    storedAt: existing?.storedAt ?? new Date().toISOString(),
    failureReason,
    attempts: (existing?.attempts ?? 0) + 1
  };

  const updated = current.filter((entry) => entry.messageId !== payload.messageId);
  updated.push(nextEntry);
  await writeEntries(updated);
  return updated;
};

export const removeFailedResult = async (messageId: string): Promise<FailedResultEntry[]> => {
  const current = await readEntries();
  const updated = current.filter((entry) => entry.messageId !== messageId);
  await writeEntries(updated);
  return updated;
};

export const replaceFailedResults = async (entries: FailedResultEntry[]): Promise<void> => {
  await writeEntries(entries);
};

export const clearFailedResults = async (): Promise<void> => {
  await Preferences.remove({ key: STORAGE_KEY });
};
