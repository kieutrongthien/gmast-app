import type { AxiosRequestConfig } from 'axios';
import { httpClient } from '@/lib/httpClient';
import {
  ensureAccessToken,
  buildAuthorizationHeader,
  setTokenOverride
} from '@/services/auth/tokenManager';
import type {
  MobileLoginRequest,
  MobileLoginResponse,
  MobileUserInfoResponse,
  SmsScheduleDetailResponse,
  SmsScheduleListResponse,
  SmsScheduleRecord,
  SmsScheduleStatusUpdateRequest,
  SmsScheduleStatusUpdateResponse
} from '@/types/mobileApi';

const LOGIN_ENDPOINT = '/auth/login';
const USER_INFO_ENDPOINT = '/user';
const SMS_SCHEDULES_ENDPOINT = '/sms-schedules';

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

const normalizeScheduleRecord = (value: unknown, fallbackId: string): SmsScheduleRecord => {
  const raw = asRecord(value);
  const id = pickString(raw.id, raw.uuid, raw.sms_schedule_id) ?? fallbackId;

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

const resolveAuthHeaders = async (token?: string): Promise<AxiosRequestConfig['headers']> => {
  const headers: AxiosRequestConfig['headers'] = {
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

export const getSmsSchedules = async (token?: string): Promise<SmsScheduleListResponse> => {
  const headers = await resolveAuthHeaders(token);
  const { data } = await httpClient.get<Record<string, unknown>>(SMS_SCHEDULES_ENDPOINT, { headers });
  const raw = asRecord(data);

  return {
    items: extractList(raw),
    raw
  };
};

export const getSmsScheduleDetail = async (id: string, token?: string): Promise<SmsScheduleDetailResponse> => {
  if (!id.trim()) {
    throw new Error('getSmsScheduleDetail requires id');
  }

  const headers = await resolveAuthHeaders(token);
  const { data } = await httpClient.get<Record<string, unknown>>(`${SMS_SCHEDULES_ENDPOINT}/${id}`, {
    headers
  });
  const raw = asRecord(data);

  return {
    item: extractDetail(raw, id),
    raw
  };
};

export const updateSmsScheduleStatus = async (
  id: string,
  payload: SmsScheduleStatusUpdateRequest,
  token?: string
): Promise<SmsScheduleStatusUpdateResponse> => {
  if (!id.trim()) {
    throw new Error('updateSmsScheduleStatus requires id');
  }

  const headers = await resolveAuthHeaders(token);
  const { data } = await httpClient.patch<Record<string, unknown>>(
    `${SMS_SCHEDULES_ENDPOINT}/${id}/status`,
    {
      status: payload.status,
      retry_increment: payload.retry_increment
    },
    { headers }
  );

  return {
    data: asRecord(data)
  };
};
