import axios from 'axios';
import { Preferences } from '@capacitor/preferences';
import { appConfig } from '@/config/appConfig';

const TOKEN_STORAGE_KEY = 'gmast::auth-token';
const authHttp = axios.create({ timeout: 12000 });

export interface AuthToken {
  token: string;
  tokenType: string;
  expiresAt?: number;
  scope?: string;
}

interface TokenEndpointResponse {
  access_token?: string;
  token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

let tokenOverride: AuthToken | null = null;

export const setTokenOverride = (token: AuthToken | null) => {
  tokenOverride = token;
};

export const buildAuthorizationHeader = (authToken: AuthToken | null): string | null => {
  if (!authToken?.token) {
    return null;
  }
  return `${authToken.tokenType ?? 'Bearer'} ${authToken.token}`.trim();
};

const parseStaticToken = (rawToken: string): AuthToken => {
  if (!rawToken.includes(' ')) {
    return { token: rawToken, tokenType: 'Bearer' };
  }
  const [type, ...rest] = rawToken.trim().split(' ');
  return { token: rest.join(' '), tokenType: type };
};

const isExpired = (expiresAt?: number): boolean => {
  if (!expiresAt) {
    return false;
  }
  return Date.now() >= expiresAt;
};

const readStoredToken = async (): Promise<AuthToken | null> => {
  const stored = await Preferences.get({ key: TOKEN_STORAGE_KEY });
  if (!stored.value) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored.value) as AuthToken;
    return parsed;
  } catch (_error) {
    return null;
  }
};

const storeToken = async (token: AuthToken): Promise<void> => {
  await Preferences.set({ key: TOKEN_STORAGE_KEY, value: JSON.stringify(token) });
};

const resolveTokenEndpoint = (): string => {
  const endpoint = appConfig.auth.tokenEndpoint ?? '';
  if (/^https?:/i.test(endpoint)) {
    return endpoint;
  }
  if (!appConfig.apiBaseUrl) {
    throw new Error('Missing API base URL. Set VITE_API_BASE_URL or use a fully qualified token endpoint.');
  }
  return `${appConfig.apiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

const fetchRemoteToken = async (): Promise<AuthToken> => {
  if (!appConfig.auth.clientId || !appConfig.auth.clientSecret) {
    throw new Error('API auth is not configured. Provide VITE_API_CLIENT_ID and VITE_API_CLIENT_SECRET or VITE_API_STATIC_TOKEN.');
  }

  const payload: Record<string, string> = {
    client_id: appConfig.auth.clientId,
    client_secret: appConfig.auth.clientSecret,
    grant_type: appConfig.auth.grantType ?? 'client_credentials'
  };

  if (appConfig.auth.audience) {
    payload.audience = appConfig.auth.audience;
  }
  if (appConfig.auth.scope) {
    payload.scope = appConfig.auth.scope;
  }

  const { data } = await authHttp.post<TokenEndpointResponse>(resolveTokenEndpoint(), payload, {
    headers: { 'Content-Type': 'application/json' }
  });

  const token = data.access_token ?? data.token;
  if (!token) {
    throw new Error('Auth endpoint response did not include an access token.');
  }

  const expiresIn = data.expires_in ?? 3600;
  const tokenDocument: AuthToken = {
    token,
    tokenType: (data.token_type ?? 'Bearer').trim(),
    expiresAt: Date.now() + expiresIn * 1000 - 5000,
    scope: data.scope
  };

  await storeToken(tokenDocument);
  return tokenDocument;
};

export const ensureAccessToken = async (): Promise<AuthToken | null> => {
  if (tokenOverride) {
    return tokenOverride;
  }

  const staticToken = appConfig.auth.staticToken?.trim();
  if (staticToken) {
    return parseStaticToken(staticToken);
  }

  const stored = await readStoredToken();
  if (stored && !isExpired(stored.expiresAt)) {
    return stored;
  }

  return fetchRemoteToken();
};

export const clearStoredToken = async (): Promise<void> => {
  await Preferences.remove({ key: TOKEN_STORAGE_KEY });
};
