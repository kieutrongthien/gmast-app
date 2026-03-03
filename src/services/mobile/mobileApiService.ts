import { httpClient, type HttpHeaders } from '@/lib/httpClient';
import {
  ensureAccessToken,
  buildAuthorizationHeader,
  setTokenOverride
} from '@/services/auth/tokenManager';
import type {
  MobileLoginRequest,
  MobileLoginResponse,
  MobileUserInfoResponse,
  SaveFcmTokenRequest,
  SaveFcmTokenResponse,
  SmsScheduleDetailResponse,
  SmsScheduleListRequest,
  SmsScheduleListResponse,
  SmsScheduleRecord,
  SmsScheduleStatistics,
  SmsScheduleStatisticsResponse,
  SmsScheduleStatusUpdateRequest,
  SmsScheduleStatusUpdateResponse
} from '@/types/mobileApi';

const LOGIN_ENDPOINT = '/auth/login';
const USER_INFO_ENDPOINT = '/user';
const SAVE_FCM_TOKEN_ENDPOINT = '/save-fcm-token';
const SMS_SCHEDULES_ENDPOINT = '/sms-schedules';
const SMS_SCHEDULES_STATISTICS_ENDPOINT = '/sms-schedules/statistics';

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const pickString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return null;
};

const pickPositiveInteger = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!/^\d+$/.test(normalized)) {
        continue;
      }

      const parsed = Number.parseInt(normalized, 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
};

const resolveScheduleIdParam = (id: string | number, operation: string): number => {
  const numericId = pickPositiveInteger(id);
  if (!numericId) {
    throw new Error(`${operation} requires a positive integer id`);
  }
  return numericId;
};

const normalizeScheduleRecord = (value: unknown, fallbackId: string): SmsScheduleRecord => {
  const raw = asRecord(value);
  const numericId = pickPositiveInteger(raw.sms_schedule_id, raw.smsScheduleId, raw.schedule_id, raw.id);
  const id = numericId ? String(numericId) : (pickString(raw.id, raw.uuid) ?? fallbackId);

  return {
    ...raw,
    id
  } as SmsScheduleRecord;
};

const resolveAuthorizationHeader = async (token?: string): Promise<string | null> => {
  const directToken = token?.trim();
  if (directToken) {
    return `Bearer ${directToken}`;
  }

  const authToken = await ensureAccessToken();
  return buildAuthorizationHeader(authToken);
};

const resolveAuthHeaders = async (token?: string): Promise<HttpHeaders> => {
  const headers: HttpHeaders = {
    Accept: 'application/json'
  };

  const authorization = await resolveAuthorizationHeader(token);
  if (authorization) {
    headers.Authorization = authorization;
  }

  return headers;
};

const extractTokenFromPayload = (payload: Record<string, unknown>): { token: string; tokenType: string } => {
  const nested = asRecord(payload.data);
  const token = pickString(payload.access_token, payload.token, nested.access_token, nested.token);

  if (!token) {
    throw new Error('Login response does not include token/access_token');
  }

  const tokenType = pickString(payload.token_type, payload.tokenType, nested.token_type, nested.tokenType) ?? 'Bearer';

  return {
    token,
    tokenType
  };
};

const extractList = (payload: Record<string, unknown>): SmsScheduleRecord[] => {
  const directData = payload.data;
  if (Array.isArray(directData)) {
    return directData.map((item, index) => normalizeScheduleRecord(item, `sms-${index}`));
  }

  const nestedData = asRecord(directData).data;
  if (Array.isArray(nestedData)) {
    return nestedData.map((item, index) => normalizeScheduleRecord(item, `sms-${index}`));
  }

  const directItems = payload.items;
  if (Array.isArray(directItems)) {
    return directItems.map((item, index) => normalizeScheduleRecord(item, `sms-${index}`));
  }

  return [];
};

const extractDetail = (payload: Record<string, unknown>, id: string): SmsScheduleRecord => {
  const directData = payload.data;

  if (directData && !Array.isArray(directData)) {
    const nestedRecord = asRecord(directData);
    if (Object.keys(nestedRecord).length > 0) {
      return normalizeScheduleRecord(nestedRecord, id);
    }
  }

  const nestedData = asRecord(directData).data;
  if (nestedData && !Array.isArray(nestedData)) {
    const nestedRecord = asRecord(nestedData);
    if (Object.keys(nestedRecord).length > 0) {
      return normalizeScheduleRecord(nestedRecord, id);
    }
  }

  if (Object.keys(payload).length > 0) {
    return normalizeScheduleRecord(payload, id);
  }

  throw new Error(`SMS schedule detail for id ${id} is empty`);
};

const readStatNumber = (record: Record<string, unknown>, key: string): number => {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const extractStatistics = (payload: Record<string, unknown>): SmsScheduleStatistics => {
  const nested = asRecord(payload.data);
  const source = Object.keys(nested).length > 0 ? nested : payload;

  return {
    pending: readStatNumber(source, 'pending'),
    processing: readStatNumber(source, 'processing'),
    sent: readStatNumber(source, 'sent'),
    failed: readStatNumber(source, 'failed')
  };
};

export const loginMobile = async (
  request: MobileLoginRequest,
  options: { persistAsActiveSession?: boolean } = {}
): Promise<MobileLoginResponse> => {
  const body = new URLSearchParams();
  body.set('username', request.username);
  body.set('password', request.password);

  const { data } = await httpClient.post<Record<string, unknown>>(LOGIN_ENDPOINT, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    }
  });

  const raw = asRecord(data);
  const { token, tokenType } = extractTokenFromPayload(raw);

  if (options.persistAsActiveSession ?? true) {
    setTokenOverride({ token, tokenType });
  }

  return {
    token,
    tokenType,
    raw
  };
};

export const getMobileUserInfo = async (token?: string): Promise<MobileUserInfoResponse> => {
  const headers = await resolveAuthHeaders(token);
  const { data } = await httpClient.get<Record<string, unknown>>(USER_INFO_ENDPOINT, { headers });

  return {
    data: asRecord(data)
  };
};

export const getSmsSchedules = async (
  token?: string,
  options: SmsScheduleListRequest = {}
): Promise<SmsScheduleListResponse> => {
  const headers = await resolveAuthHeaders(token);
  const params: Record<string, number> = {};
  if (typeof options.page === 'number' && Number.isFinite(options.page) && options.page > 0) {
    params.page = Math.trunc(options.page);
  }
  if (typeof options.per_page === 'number' && Number.isFinite(options.per_page) && options.per_page > 0) {
    params.per_page = Math.trunc(options.per_page);
  }

  const { data } = await httpClient.get<Record<string, unknown>>(SMS_SCHEDULES_ENDPOINT, {
    headers,
    params
  });
  const raw = asRecord(data);

  return {
    items: extractList(raw),
    raw
  };
};

export const getSmsScheduleStatistics = async (token?: string): Promise<SmsScheduleStatisticsResponse> => {
  const headers = await resolveAuthHeaders(token);
  const { data } = await httpClient.get<Record<string, unknown>>(SMS_SCHEDULES_STATISTICS_ENDPOINT, { headers });
  const raw = asRecord(data);

  return {
    data: extractStatistics(raw),
    raw
  };
};

export const getSmsScheduleDetail = async (id: string | number, token?: string): Promise<SmsScheduleDetailResponse> => {
  const scheduleId = resolveScheduleIdParam(id, 'getSmsScheduleDetail');

  const headers = await resolveAuthHeaders(token);
  const { data } = await httpClient.get<Record<string, unknown>>(`${SMS_SCHEDULES_ENDPOINT}/${scheduleId}`, {
    headers
  });
  const raw = asRecord(data);

  return {
    item: extractDetail(raw, String(scheduleId)),
    raw
  };
};

export const updateSmsScheduleStatus = async (
  id: string | number,
  payload: SmsScheduleStatusUpdateRequest,
  token?: string
): Promise<SmsScheduleStatusUpdateResponse> => {
  const scheduleId = resolveScheduleIdParam(id, 'updateSmsScheduleStatus');

  const headers = await resolveAuthHeaders(token);
  const { data } = await httpClient.patch<Record<string, unknown>>(
    `${SMS_SCHEDULES_ENDPOINT}/${scheduleId}/status`,
    {
      status: payload.status,
      retry_increment: payload.retry_increment
    },
    {
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    }
  );

  return {
    data: asRecord(data)
  };
};

export const saveMobileFcmToken = async (
  payload: SaveFcmTokenRequest,
  token?: string
): Promise<SaveFcmTokenResponse> => {
  if (!payload.token?.trim()) {
    throw new Error('saveMobileFcmToken requires token');
  }

  const headers = await resolveAuthHeaders(token);
  const { data } = await httpClient.post<Record<string, unknown>>(
    SAVE_FCM_TOKEN_ENDPOINT,
    {
      token: payload.token.trim(),
      platform: payload.platform ?? 'android'
    },
    {
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    }
  );

  return {
    data: asRecord(data)
  };
};
