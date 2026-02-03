/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_CLIENT_ID?: string;
  readonly VITE_API_CLIENT_SECRET?: string;
  readonly VITE_API_TOKEN_ENDPOINT?: string;
  readonly VITE_API_AUDIENCE?: string;
  readonly VITE_API_SCOPE?: string;
  readonly VITE_API_STATIC_TOKEN?: string;
  readonly VITE_API_GRANT_TYPE?: string;
  readonly VITE_QUEUE_PAGE_SIZE?: string;
  readonly VITE_QUEUE_MAX_PAGE_SIZE?: string;
  readonly VITE_QUEUE_RETRY_ATTEMPTS?: string;
  readonly VITE_QUEUE_RETRY_DELAY_MS?: string;
  readonly VITE_QUEUE_RETRY_BACKOFF?: string;
  readonly VITE_QUEUE_CACHE_KEY?: string;
  readonly VITE_RESULT_CACHE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
