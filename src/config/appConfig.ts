type EnvRecord = Record<string, string | undefined>;

const envSource: EnvRecord = (() => {
  try {
    return (import.meta.env as EnvRecord);
  } catch (_error) {
    return (globalThis?.process?.env as EnvRecord) ?? {};
  }
})();

const toNumber = (value: string | undefined, fallback: number): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

const trimTrailingSlash = (value: string | undefined): string => {
  if (!value) {
    return '';
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export const appConfig = {
  apiBaseUrl: trimTrailingSlash(envSource.VITE_API_BASE_URL),
  auth: {
    clientId: envSource.VITE_API_CLIENT_ID ?? '',
    clientSecret: envSource.VITE_API_CLIENT_SECRET ?? '',
    tokenEndpoint: envSource.VITE_API_TOKEN_ENDPOINT ?? '/auth/token',
    audience: envSource.VITE_API_AUDIENCE ?? '',
    scope: envSource.VITE_API_SCOPE ?? '',
    staticToken: envSource.VITE_API_STATIC_TOKEN ?? '',
    grantType: envSource.VITE_API_GRANT_TYPE ?? 'client_credentials'
  },
  queue: {
    defaultPageSize: toNumber(envSource.VITE_QUEUE_PAGE_SIZE, 50),
    maxPageSize: toNumber(envSource.VITE_QUEUE_MAX_PAGE_SIZE, 200),
    retry: {
      attempts: toNumber(envSource.VITE_QUEUE_RETRY_ATTEMPTS, 3),
      baseDelayMs: toNumber(envSource.VITE_QUEUE_RETRY_DELAY_MS, 400),
      multiplier: toNumber(envSource.VITE_QUEUE_RETRY_BACKOFF, 2)
    },
    cacheKey: envSource.VITE_QUEUE_CACHE_KEY ?? 'gmast::queue-cache',
    refreshIntervalMs: toNumber(envSource.VITE_QUEUE_REFRESH_INTERVAL_MS, 60 * 1000),
    minRefreshGapMs: toNumber(envSource.VITE_QUEUE_REFRESH_GAP_MS, 10 * 1000)
  },
  results: {
    cacheKey: envSource.VITE_RESULT_CACHE_KEY ?? 'gmast::result-cache'
  },
  send: {
    preferenceKey: envSource.VITE_SEND_PREFERENCES_KEY ?? 'gmast::send-config'
  },
  version: {
    cacheKey: envSource.VITE_VERSION_CACHE_KEY ?? 'gmast::version-check',
    cacheTtlMs: toNumber(envSource.VITE_VERSION_CACHE_TTL_MS, 5 * 60 * 1000),
    fallbackBuild: envSource.VITE_APP_BUILD ?? '',
    fallbackVersion: envSource.VITE_APP_VERSION ?? ''
  }
} as const;

export type AppConfig = typeof appConfig;
