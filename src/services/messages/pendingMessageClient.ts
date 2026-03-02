import { appConfig } from '@/config/appConfig';
import { saveQueueSnapshot, loadQueueSnapshot } from '@/services/messages/queueStorage';
import { withRetry } from '@/utils/retry';
import { getSmsSchedules } from '@/services/mobile';
import type {
  QueueMessage,
  QueueMessagePriority,
  QueueMessageStatus,
  QueueSnapshot,
  QueuePageMeta
} from '@/types/queue';

export interface FetchPendingMessagesOptions {
  page?: number;
  pageSize?: number;
  persist?: boolean;
}

export interface FetchFullQueueOptions extends Omit<FetchPendingMessagesOptions, 'page'> {
  maxPages?: number;
}

const DEFAULT_MAX_PAGES = 20;

const sanitizePageSize = (value: number): number => {
  if (!Number.isFinite(value)) {
    return appConfig.queue.defaultPageSize;
  }
  const coerced = Math.trunc(value);
  if (coerced <= 0) {
    return appConfig.queue.defaultPageSize;
  }
  return Math.min(coerced, appConfig.queue.maxPageSize);
};

const toPriority = (value?: string | number | null): QueueMessagePriority => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 50) {
      return 'low';
    }
    if (value <= 100) {
      return 'normal';
    }
    if (value <= 200) {
      return 'high';
    }
    return 'critical';
  }

  switch ((value ?? '').toString().toLowerCase()) {
    case '1':
    case 'low':
      return 'low';
    case '2':
    case 'normal':
      return 'normal';
    case '3':
    case 'high':
      return 'high';
    case '4':
    case 'critical':
      return 'critical';
    default:
      return 'normal';
  }
};

const toStatus = (value?: string | number | null): QueueMessageStatus => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    switch (value) {
      case -1:
        return 'failed';
      case 0:
        return 'pending';
      case 1:
        return 'sent';
      case 2:
        return 'processing';
      default:
        return 'unknown';
    }
  }

  switch ((value ?? '').toString().toLowerCase()) {
    case '0':
    case 'pending':
      return 'pending';
    case '2':
    case 'processing':
      return 'processing';
    case '-1':
    case 'failed':
      return 'failed';
    case '1':
    case 'sent':
      return 'sent';
    default:
      return 'unknown';
  }
};

const toTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

type QueueApiRecord = Record<string, unknown>;

const readString = (record: QueueApiRecord, ...keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
};

const readNumber = (record: QueueApiRecord, ...keys: string[]): number | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

const normalizeRecord = (record: QueueApiRecord): QueueMessage => {
  const now = new Date().toISOString();
  const createdAt = readString(record, 'created_at', 'createdAt') ?? now;
  const updatedAt = readString(record, 'updated_at', 'updatedAt') ?? createdAt;
  const messageId = readString(record, 'id', 'sms_schedule_id') ?? crypto.randomUUID();

  return {
    id: messageId,
    groupUsername: readString(record, 'group_username', 'groupUsername'),
    studentId: readString(record, 'student_id', 'studentId'),
    receiver: readString(record, 'receiver', 'phone', 'phone_number') ?? '',
    title: readString(record, 'title', 'subject'),
    message: readString(record, 'message', 'content', 'body') ?? '',
    dedupeKey: readString(record, 'dedupeKey', 'dedupe_key'),
    priority: toPriority(readNumber(record, 'priority') ?? readString(record, 'priority')),
    status: toStatus(readNumber(record, 'status') ?? readString(record, 'status')),
    createdAt,
    updatedAt,
    retryCount: readNumber(record, 'retryCount', 'retry_count') ?? 0,
    tags: toTags(record.tags)
  };
};

const buildMeta = (
  allItemsCount: number,
  page: number,
  pageSize: number
): QueuePageMeta => {
  const totalPages = Math.max(1, Math.ceil(allItemsCount / pageSize));
  const hasNextPage = page < totalPages;
  const fetchedAt = new Date().toISOString();

  return {
    page,
    pageSize,
    totalPages,
    totalItems: allItemsCount,
    hasNextPage,
    fetchedAt
  };
};

const requestPendingMessages = async (
  page: number,
  pageSize: number
): Promise<QueueSnapshot> => {
  if (!appConfig.apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.');
  }

  const { items } = await withRetry(() => getSmsSchedules());
  const normalized = items.map((item) => normalizeRecord(item as QueueApiRecord));
  const startIndex = Math.max(0, (page - 1) * pageSize);
  const endIndex = startIndex + pageSize;
  const messages = normalized.slice(startIndex, endIndex);
  const meta = buildMeta(normalized.length, page, pageSize);

  return {
    messages,
    meta,
    updatedAt: meta.fetchedAt
  };
};

export const fetchPendingMessages = async (
  options: FetchPendingMessagesOptions = {}
): Promise<QueueSnapshot> => {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = sanitizePageSize(options.pageSize ?? appConfig.queue.defaultPageSize);
  const snapshot = await requestPendingMessages(page, pageSize);

  if (options.persist ?? true) {
    await saveQueueSnapshot(snapshot);
  }

  return snapshot;
};

export const fetchFullPendingQueue = async (
  options: FetchFullQueueOptions = {}
): Promise<QueueSnapshot> => {
  const pageSize = sanitizePageSize(options.pageSize ?? appConfig.queue.defaultPageSize);
  const persist = options.persist ?? true;
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES);

  let currentPage = 1;
  let aggregatedMessages: QueueMessage[] = [];
  let latestMeta: QueuePageMeta | null = null;

  while (currentPage <= maxPages) {
    const snapshot = await fetchPendingMessages({ page: currentPage, pageSize, persist: false });
    aggregatedMessages = aggregatedMessages.concat(snapshot.messages);
    latestMeta = snapshot.meta;

    if (!snapshot.meta.hasNextPage) {
      break;
    }

    currentPage += 1;
  }

  const updatedAt = new Date().toISOString();
  const finalSnapshot: QueueSnapshot = {
    messages: aggregatedMessages,
    meta:
      latestMeta ?? {
        page: 1,
        pageSize,
        totalPages: 1,
        totalItems: 0,
        hasNextPage: false,
        fetchedAt: updatedAt
      },
    updatedAt
  };

  if (latestMeta) {
    finalSnapshot.meta = {
      ...latestMeta,
      page: 1,
      pageSize,
      totalItems: aggregatedMessages.length,
      hasNextPage: latestMeta.hasNextPage && currentPage < maxPages + 1,
      fetchedAt: updatedAt
    };
  }

  if (persist) {
    await saveQueueSnapshot(finalSnapshot);
  }

  return finalSnapshot;
};

export const getCachedPendingQueue = async (): Promise<QueueSnapshot | null> =>
  loadQueueSnapshot();
