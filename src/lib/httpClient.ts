import { CapacitorHttp } from '@capacitor/core';
import { appConfig } from '@/config/appConfig';

export type HttpHeaders = Record<string, string>;

export interface HttpRequestConfig {
  headers?: HttpHeaders;
  params?: Record<string, string | number | boolean | null | undefined>;
  timeout?: number;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
  url?: string;
}

export interface HttpError extends Error {
  isHttpError: true;
  response: HttpResponse<unknown>;
  request: {
    url: string;
    method: string;
  };
}

const DEFAULT_TIMEOUT_MS = 12000;

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const resolveUrl = (url: string): string => {
  if (isAbsoluteUrl(url)) {
    return url;
  }

  if (!appConfig.apiBaseUrl) {
    return url;
  }

  if (!url.startsWith('/')) {
    return `${appConfig.apiBaseUrl}/${url}`;
  }

  return `${appConfig.apiBaseUrl}${url}`;
};

const normalizeHeaders = (headers?: HttpHeaders): HttpHeaders => {
  if (!headers) {
    return {};
  }

  const normalized: HttpHeaders = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === 'string') {
      normalized[key] = value;
    }
  });
  return normalized;
};

const ensureContentType = (headers: HttpHeaders, data: unknown): HttpHeaders => {
  if (data === undefined || data === null) {
    return headers;
  }

  const existing = Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type');
  if (existing) {
    return headers;
  }

  if (typeof data === 'string') {
    return headers;
  }

  return {
    ...headers,
    'Content-Type': 'application/json'
  };
};

const normalizeRequestData = (headers: HttpHeaders, data: unknown): unknown => {
  if (data === undefined || data === null) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  const contentType = extractHeader(headers, 'content-type')?.toLowerCase() ?? '';
  if (contentType.includes('application/json')) {
    return JSON.stringify(data);
  }

  return data;
};

const normalizeParams = (
  params?: Record<string, string | number | boolean | null | undefined>
): Record<string, string> | undefined => {
  if (!params) {
    return undefined;
  }

  const normalized = Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === null || value === undefined) {
      return acc;
    }
    acc[key] = String(value);
    return acc;
  }, {});

  return Object.keys(normalized).length ? normalized : undefined;
};

const extractHeader = (headers: Record<string, string>, name: string): string | undefined => {
  const lowerName = name.toLowerCase();
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
  return found?.[1];
};

const parseResponseData = <T>(data: unknown, headers: Record<string, string>): T => {
  if (typeof data !== 'string') {
    return data as T;
  }

  const contentType = extractHeader(headers, 'content-type') ?? '';
  const shouldParseJson = contentType.toLowerCase().includes('application/json');
  const looksLikeJson = /^\s*[\[{]/.test(data);

  if (!shouldParseJson && !looksLikeJson) {
    return data as T;
  }

  try {
    return JSON.parse(data) as T;
  } catch (_error) {
    return data as T;
  }
};

const createHttpError = (
  method: string,
  url: string,
  response: HttpResponse<unknown>
): HttpError => {
  const payload = response.data as Record<string, unknown> | undefined;
  const responseMessage = typeof payload?.message === 'string' ? payload.message : '';
  const suffix = responseMessage ? ` - ${responseMessage}` : '';
  const error = new Error(`HTTP ${response.status} ${method.toUpperCase()} ${url}${suffix}`) as HttpError;
  error.isHttpError = true;
  error.response = response;
  error.request = { method, url };
  return error;
};

const request = async <T>(
  method: 'get' | 'post' | 'patch',
  url: string,
  data?: unknown,
  config: HttpRequestConfig = {}
): Promise<HttpResponse<T>> => {
  const resolvedUrl = resolveUrl(url);
  const timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
  const normalizedHeaders = ensureContentType(normalizeHeaders(config.headers), data);
  const normalizedData = normalizeRequestData(normalizedHeaders, data);

  const rawResponse = await CapacitorHttp.request({
    url: resolvedUrl,
    method: method.toUpperCase(),
    headers: normalizedHeaders,
    params: normalizeParams(config.params),
    data: normalizedData,
    connectTimeout: timeout,
    readTimeout: timeout
  });

  const response: HttpResponse<T> = {
    data: parseResponseData<T>(rawResponse.data, rawResponse.headers ?? {}),
    status: rawResponse.status,
    headers: rawResponse.headers ?? {},
    url: rawResponse.url
  };

  if (response.status < 200 || response.status >= 300) {
    throw createHttpError(method, resolvedUrl, response as HttpResponse<unknown>);
  }

  return response;
};

export const isHttpError = (error: unknown): error is HttpError =>
  Boolean(error && typeof error === 'object' && (error as HttpError).isHttpError === true);

export const httpClient = {
  get: <T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> =>
    request<T>('get', url, undefined, config),
  post: <T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> =>
    request<T>('post', url, data, config),
  patch: <T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> =>
    request<T>('patch', url, data, config)
};
