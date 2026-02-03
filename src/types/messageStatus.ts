export type RemoteMessageStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'unknown';

export interface RemoteMessageStatusFlags {
  processing?: boolean;
  sent?: boolean;
  failed?: boolean;
}

export interface RemoteMessageStatusResponse {
  id?: string;
  status?: RemoteMessageStatus | string;
  flags?: RemoteMessageStatusFlags;
  updated_at?: string;
  updatedAt?: string;
  checked_at?: string;
  checkedAt?: string;
  metadata?: Record<string, unknown>;
}

export enum PreSendState {
  Sendable = 'sendable',
  AlreadyProcessing = 'processing',
  AlreadySent = 'sent',
  Failed = 'failed',
  Unknown = 'unknown',
  NotFound = 'not_found'
}

export interface PreSendStatusResult {
  messageId: string;
  state: PreSendState;
  canSend: boolean;
  rawStatus: string | null;
  flags: RemoteMessageStatusFlags;
  checkedAt?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
}
