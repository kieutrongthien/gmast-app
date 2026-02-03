export type DeliveryOutcome = 'sent' | 'delivered' | 'failed' | 'queued' | 'cancelled';

export interface DeliveryResultPayload {
  messageId: string;
  outcome: DeliveryOutcome;
  description?: string;
  errorCode?: string;
  errorDetail?: string;
  metadata?: Record<string, unknown>;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  retries?: number;
  deviceId?: string;
  simSlot?: number;
}

export interface DeliveryResultResponse {
  success: boolean;
  stored?: boolean;
  messageId?: string;
  errors?: Array<{ code: string; message: string }>;
  requestId?: string;
}
