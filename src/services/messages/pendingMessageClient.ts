import type { AxiosRequestConfig } from 'axios';
import { httpClient } from '@/lib/httpClient';
import { appConfig } from '@/config/appConfig';
import { ensureAccessToken, buildAuthorizationHeader } from '@/services/auth/tokenManager';
import { saveQueueSnapshot, loadQueueSnapshot } from '@/services/messages/queueStorage';
import { withRetry } from '@/utils/retry';
import type {
  QueueMessage,
  QueueMessagePriority,
  QueueMessageStatus,
  QueueSnapshot,
  PendingMessageApiRecord,
  PendingMessageApiResponse,
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

const ENDPOINT = '/messages/pending';
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

const toPriority = (value?: string | number): QueueMessagePriority => {
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

const toStatus = (value?: string | number): QueueMessageStatus => {
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

const toTags = (value: PendingMessageApiRecord['tags']): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const normalizeRecord = (record: PendingMessageApiRecord): QueueMessage => {
  const now = new Date().toISOString();
  const createdAt = record.created_at ?? now;
  const updatedAt = record.updated_at ?? createdAt;

  return {
    id: record.id ?? crypto.randomUUID(),
    groupUsername: record.group_username ?? null,
    studentId: record.student_id ?? null,
    receiver: record.receiver ?? '',
    title: record.title ?? null,
    message: record.message ?? '',
    dedupeKey: record.dedupeKey ?? null,
    priority: toPriority(record.priority),
    status: toStatus(record.status),
    createdAt,
    updatedAt,
    retryCount: record.retryCount ?? 0,
    tags: toTags(record.tags)
  };
};

const normalizeMeta = (
  response: PendingMessageApiResponse,
  fallback: { page: number; pageSize: number }
): QueuePageMeta => {
  const meta = response.meta ?? {};
  const page = meta.page ?? fallback.page;
  const pageSize = meta.pageSize ?? meta.perPage ?? fallback.pageSize;
  const totalPages = meta.totalPages ?? meta.total ?? 1;
  const totalItems = meta.totalItems ?? meta.total ?? response.data.length;
  const hasNextPage =
    typeof meta.hasNext === 'boolean'
      ? meta.hasNext
      : typeof meta.hasMore === 'boolean'
      ? meta.hasMore
      : page < (meta.totalPages ?? totalPages ?? 1);
  const fetchedAt = new Date().toISOString();

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
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

  const authToken = await ensureAccessToken();
  const headers: AxiosRequestConfig['headers'] = {};
  const authorization = buildAuthorizationHeader(authToken);
  if (authorization) {
    headers.Authorization = authorization;
  }

  const { data } = await withRetry(() =>
    httpClient.get<PendingMessageApiResponse>(ENDPOINT, {
      params: { page, pageSize },
      headers
    })
  );

  const meta = normalizeMeta(data, { page, pageSize });
  const messages = data.data.map(normalizeRecord);

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
