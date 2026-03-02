export type QueueMessageStatus =
  | 'processing'
  | 'pending'
  | 'failed'
  | 'sent'
  | 'unknown';

export type QueueMessagePriority = 'low' | 'normal' | 'high' | 'critical';

export interface QueueMessage {
  id: string;
  groupUsername: string | null;
  studentId: string | null;
  receiver: string;
  title: string | null;
  message: string;
  dedupeKey: string | null;
  priority: QueueMessagePriority;
  status: QueueMessageStatus;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  tags: string[];
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

export interface PendingMessageApiRecord {
  id: string;
  group_username?: string | null;
  student_id?: string | null;
  receiver?: string | null;
  title?: string | null;
  message?: string | null;
  status?: number | string | null;
  dedupeKey?: string | null;
  priority?: number | string | null;
  retryCount?: number | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
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
