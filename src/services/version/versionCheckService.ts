import type { AxiosRequestConfig } from 'axios';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { appConfig } from '@/config/appConfig';
import { httpClient } from '@/lib/httpClient';
import { ensureAccessToken, buildAuthorizationHeader } from '@/services/auth/tokenManager';
import { withRetry } from '@/utils/retry';
import type {
  VersionCheckOptions,
  VersionCheckReason,
  VersionCheckSnapshot,
  VersionPlatform
} from '@/types/version';

const VERSION_ENDPOINT = '/app-version';
const VERSION_CACHE_KEY = appConfig.version.cacheKey;
const SUPPORTED_PLATFORMS: VersionPlatform[] = ['android', 'ios'];

interface VersionRecord {
  version?: string | number | null;
  build?: string | number | null;
  message?: string | null;
  changelog?: string | null;
  downloadUrl?: string | null;
  link?: string | null;
}

interface AppVersionApiResponse {
  platform?: string | null;
  required?: VersionRecord;
  minimum?: VersionRecord;
  latest?: VersionRecord;
  recommended?: VersionRecord;
  requiredVersion?: string | number | null;
  requiredBuild?: string | number | null;
  minimumVersion?: string | number | null;
  minimumBuild?: string | number | null;
  latestVersion?: string | number | null;
  latestBuild?: string | number | null;
  recommendedVersion?: string | number | null;
  recommendedBuild?: string | number | null;
  downloadUrl?: string | null;
  storeUrl?: string | null;
  apkUrl?: string | null;
  link?: string | null;
  message?: string | null;
  changelog?: string | null;
  releaseNotes?: string | null;
  gracePeriodHours?: number | string | null;
  grace_period_hours?: number | string | null;
  expiresAt?: string | null;
  expires_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

interface AppInfo {
  version: string | null;
  build: string | null;
}

interface VersionManifest {
  platform: VersionPlatform;
  requiredVersion: string | null;
  requiredBuild: string | null;
  latestVersion: string | null;
  latestBuild: string | null;
  message: string | null;
  changelog: string | null;
  downloadUrl: string | null;
  gracePeriodHours: number | null;
  updatedAt: string | null;
  expiresAt: string | null;
}

const sanitizeString = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const pickString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const result = sanitizeString(value);
    if (result) {
      return result;
    }
  }
  return null;
};

const pickNumber = (...values: Array<unknown>): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const pickNumericString = (...values: unknown[]): string | null => {
  const numeric = pickNumber(...values);
  if (numeric !== null) {
    return String(numeric);
  }
  return pickString(...values);
};

const parsePlatform = (value: string | null | undefined): VersionPlatform => {
  const normalized = value?.toLowerCase();
  if (normalized === 'android' || normalized === 'ios') {
    return normalized;
  }
  if (normalized === 'web') {
    return 'web';
  }
  return 'unknown';
};

const resolvePlatform = (): VersionPlatform => {
  const platform = Capacitor.getPlatform?.() ?? 'web';
  if (platform === 'android' || platform === 'ios' || platform === 'web') {
    return platform;
  }
  return 'unknown';
};

const isSupportedPlatform = (platform: VersionPlatform): boolean =>
  SUPPORTED_PLATFORMS.includes(platform);

const resolveAppInfo = async (): Promise<AppInfo> => {
  try {
    const info = await App.getInfo();
    return {
      version: pickString(info.version, appConfig.version.fallbackVersion),
      build: pickString(info.build, appConfig.version.fallbackBuild)
    };
  } catch (_error) {
    return {
      version: pickString(appConfig.version.fallbackVersion),
      build: pickString(appConfig.version.fallbackBuild)
    };
  }
};

const normalizeManifest = (
  payload: AppVersionApiResponse,
  fallbackPlatform: VersionPlatform
): VersionManifest => {
  const platform = parsePlatform(payload.platform) ?? fallbackPlatform;

  return {
    platform: platform === 'unknown' ? fallbackPlatform : platform,
    requiredVersion: pickString(
      payload.requiredVersion,
      payload.minimumVersion,
      payload.required?.version,
      payload.minimum?.version
    ),
    requiredBuild: pickNumericString(
      payload.requiredBuild,
      payload.minimumBuild,
      payload.required?.build,
      payload.minimum?.build
    ),
    latestVersion: pickString(
      payload.latestVersion,
      payload.recommendedVersion,
      payload.latest?.version,
      payload.recommended?.version
    ),
    latestBuild: pickNumericString(
      payload.latestBuild,
      payload.recommendedBuild,
      payload.latest?.build,
      payload.recommended?.build
    ),
    message: pickString(payload.message, payload.required?.message),
    changelog: pickString(payload.changelog, payload.releaseNotes, payload.latest?.changelog),
    downloadUrl: pickString(
      payload.downloadUrl,
      payload.storeUrl,
      payload.apkUrl,
      payload.link,
      payload.required?.downloadUrl,
      payload.latest?.downloadUrl,
      payload.recommended?.downloadUrl
    ),
    gracePeriodHours: pickNumber(payload.gracePeriodHours, payload.grace_period_hours),
    updatedAt: pickString(payload.updatedAt, payload.updated_at),
    expiresAt: pickString(payload.expiresAt, payload.expires_at)
  };
};

const compareComparable = (current: string | null, target: string | null): number | null => {
  if (!current || !target) {
    return null;
  }
  return current.localeCompare(target, undefined, { sensitivity: 'base', numeric: true });
};

const determineStatus = (
  manifest: VersionManifest,
  info: AppInfo
): { status: VersionCheckSnapshot['status']; reason?: VersionCheckReason } => {
  const currentComparable = info.build ?? info.version;
  const requiredComparable = manifest.requiredBuild ?? manifest.requiredVersion;

  if (!currentComparable) {
    return { status: 'unknown', reason: 'missing-app-info' };
  }

  if (!requiredComparable) {
    return { status: 'unknown', reason: 'missing-required-version' };
  }

  const requiredComparison = compareComparable(currentComparable, requiredComparable) ?? 0;
  if (requiredComparison < 0) {
    return { status: 'blocked', reason: 'required-build-mismatch' };
  }

  const latestComparable = manifest.latestBuild ?? manifest.latestVersion;
  if (latestComparable) {
    const latestComparison = compareComparable(currentComparable, latestComparable) ?? 0;
    if (latestComparison < 0) {
      return { status: 'update-available', reason: 'newer-build-available' };
    }
  }

  return { status: 'supported' };
};

const createSnapshotBase = (
  status: VersionCheckSnapshot['status'],
  platform: VersionPlatform,
  info: AppInfo,
  reason?: VersionCheckReason
): VersionCheckSnapshot => ({
  status,
  reason,
  platform,
  currentVersion: info.version,
  currentBuild: info.build,
  requiredVersion: null,
  requiredBuild: null,
  latestVersion: null,
  latestBuild: null,
  message: null,
  changelog: null,
  downloadUrl: null,
  gracePeriodHours: null,
  expiresAt: null,
  updatedAt: null,
  fetchedAt: new Date().toISOString()
});

const buildSnapshotFromManifest = (manifest: VersionManifest, info: AppInfo): VersionCheckSnapshot => {
  const result = determineStatus(manifest, info);
  return {
    status: result.status,
    reason: result.reason,
    platform: manifest.platform,
    currentVersion: info.version,
    currentBuild: info.build,
    requiredVersion: manifest.requiredVersion,
    requiredBuild: manifest.requiredBuild,
    latestVersion: manifest.latestVersion,
    latestBuild: manifest.latestBuild,
    message: manifest.message,
    changelog: manifest.changelog,
    downloadUrl: manifest.downloadUrl,
    gracePeriodHours: manifest.gracePeriodHours,
    expiresAt: manifest.expiresAt,
    updatedAt: manifest.updatedAt,
    fetchedAt: new Date().toISOString()
  };
};

const fetchVersionPayload = async (
  platform: VersionPlatform,
  build: string | null
): Promise<AppVersionApiResponse> => {
  const authToken = await ensureAccessToken();
  const headers: AxiosRequestConfig['headers'] = {};
  const authorization = buildAuthorizationHeader(authToken);
  if (authorization) {
    headers.Authorization = authorization;
  }

  const params: Record<string, string> = { platform };
  if (build) {
    params.build = build;
  }

  const { data } = await withRetry(() =>
    httpClient.get<AppVersionApiResponse>(VERSION_ENDPOINT, { params, headers })
  );
  return data;
};

const readCachedSnapshot = async (): Promise<VersionCheckSnapshot | null> => {
  if (!VERSION_CACHE_KEY) {
    return null;
  }

  const stored = await Preferences.get({ key: VERSION_CACHE_KEY });
  if (!stored.value) {
    return null;
  }

  try {
    return JSON.parse(stored.value) as VersionCheckSnapshot;
  } catch (_error) {
    return null;
  }
};

const persistSnapshot = async (snapshot: VersionCheckSnapshot): Promise<void> => {
  if (!VERSION_CACHE_KEY) {
    return;
  }
  await Preferences.set({ key: VERSION_CACHE_KEY, value: JSON.stringify(snapshot) });
};

const isSnapshotFresh = (snapshot: VersionCheckSnapshot): boolean => {
  const ttl = appConfig.version.cacheTtlMs;
  if (!ttl) {
    return false;
  }
  const fetchedAt = Date.parse(snapshot.fetchedAt);
  if (Number.isNaN(fetchedAt)) {
    return false;
  }
  return Date.now() - fetchedAt < ttl;
};

const handleNetworkFailure = async (
  cached: VersionCheckSnapshot | null,
  platform: VersionPlatform,
  info: AppInfo,
  persist: boolean
): Promise<VersionCheckSnapshot> => {
  if (cached) {
    return { ...cached, reason: 'using-cached-result' };
  }

  const snapshot = createSnapshotBase('unknown', platform, info, 'network-error');
  if (persist) {
    await persistSnapshot(snapshot);
  }
  return snapshot;
};

export const checkAppVersion = async (
  options: VersionCheckOptions = {}
): Promise<VersionCheckSnapshot> => {
  const platform = resolvePlatform();
  const info = await resolveAppInfo();
  const useCache = options.useCache ?? true;
  const persist = options.persist ?? true;

  if (!isSupportedPlatform(platform)) {
    const snapshot = createSnapshotBase('unsupported', platform, info, 'unsupported-platform');
    if (persist) {
      await persistSnapshot(snapshot);
    }
    return snapshot;
  }

  if (!appConfig.apiBaseUrl) {
    const snapshot = createSnapshotBase('unknown', platform, info, 'missing-api-base-url');
    if (persist) {
      await persistSnapshot(snapshot);
    }
    return snapshot;
  }

  const cached = useCache ? await readCachedSnapshot() : null;
  if (useCache && !options.forceRefresh && cached && isSnapshotFresh(cached)) {
    return cached;
  }

  try {
    const payload = await fetchVersionPayload(platform, info.build ?? info.version);
    const manifest = normalizeManifest(payload, platform);
    const snapshot = buildSnapshotFromManifest(manifest, info);
    if (persist) {
      await persistSnapshot(snapshot);
    }
    return snapshot;
  } catch (_error) {
    return handleNetworkFailure(cached, platform, info, persist);
  }
};

export const getCachedVersionCheck = async (): Promise<VersionCheckSnapshot | null> =>
  readCachedSnapshot();

export const clearCachedVersionCheck = async (): Promise<void> => {
  if (!VERSION_CACHE_KEY) {
    return;
  }
  await Preferences.remove({ key: VERSION_CACHE_KEY });
};
