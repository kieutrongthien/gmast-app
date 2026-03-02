export type SmsScheduleStatus = 'pending' | 'failed' | 'sent' | 'processing';

export interface MobileLoginRequest {
  username: string;
  password: string;
}

export interface MobileLoginResponse {
  token: string;
  tokenType: string;
  raw: Record<string, unknown>;
}

export interface MobileUserInfoResponse {
  data: Record<string, unknown>;
}

export interface SmsScheduleRecord {
  id: string;
  status?: string;
  retry_increment?: boolean;
  retryCount?: number;
  [key: string]: unknown;
}

export interface SmsScheduleListResponse {
  items: SmsScheduleRecord[];
  raw: Record<string, unknown>;
}

export interface SmsScheduleDetailResponse {
  item: SmsScheduleRecord;
  raw: Record<string, unknown>;
}

export interface SmsScheduleStatusUpdateRequest {
  status: SmsScheduleStatus;
  retry_increment: boolean;
}

export interface SmsScheduleStatusUpdateResponse {
  data: Record<string, unknown>;
}

export interface SaveFcmTokenRequest {
  token: string;
  platform?: string;
}

export interface SaveFcmTokenResponse {
  data: Record<string, unknown>;
}
