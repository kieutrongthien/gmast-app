export type QueueMessageStatus =
  | 'pending'
  | 'queued'
  | 'held'
  | 'failed'
  | 'sent'
  | 'unknown';

export type QueueMessagePriority = 'low' | 'normal' | 'high' | 'critical';

export type QueueMessageChannel = 'sms' | 'mms' | 'whatsapp' | 'telegram' | 'email' | 'voice' | 'unknown';

export interface QueueMessage {
  id: string;
  dedupeKey?: string | null;
  to: string;
  body: string;
  mediaUrls: string[];
  channel: QueueMessageChannel;
  priority: QueueMessagePriority;
  status: QueueMessageStatus;
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface QueuePageMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  fetchedAt: string;
}

export interface QueueSnapshot {
  messages: QueueMessage[];
  meta: QueuePageMeta;
  updatedAt: string;
}

export interface PendingMessageScheduleWindow {
  start?: string | null;
  end?: string | null;
}

export interface PendingMessageApiRecord {
  id?: string;
  messageId?: string;
  batchId?: string;
  batch_id?: string;
  destination?: string;
  to?: string;
  body?: string;
  message?: string;
  media?: string[];
  attachments?: string[];
  channel?: string;
  priority?: string;
  status?: string;
  schedule?: PendingMessageScheduleWindow;
  scheduled_at?: string | null;
  retry_count?: number;
  retryCount?: number;
  tags?: string[];
  labels?: string[];
  metadata?: Record<string, unknown>;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface PendingMessageApiMeta {
  page?: number;
  pageSize?: number;
  perPage?: number;
  totalPages?: number;
  total?: number;
  totalItems?: number;
  hasNext?: boolean;
  hasMore?: boolean;
}

export interface PendingMessageApiResponse {
  data: PendingMessageApiRecord[];
  meta?: PendingMessageApiMeta;
}
