import { beforeEach, describe, expect, it, vi } from 'vitest';

const platformRef = { current: 'android' as 'android' | 'ios' | 'web' | 'unknown' };

const appInfoMock = vi.fn();
const preferenceStore: Record<string, string> = {};
const httpGetMock = vi.fn();
const ensureAccessTokenMock = vi.fn();
const buildAuthorizationHeaderMock = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => platformRef.current
  }
}));

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: (...args: unknown[]) => appInfoMock(...args)
  }
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: preferenceStore[key] })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      preferenceStore[key] = value;
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      delete preferenceStore[key];
    })
  }
}));

vi.mock('@/lib/httpClient', () => ({
  httpClient: {
    get: vi.fn((...args: unknown[]) => httpGetMock(...args))
  }
}));

vi.mock('@/services/auth/tokenManager', () => ({
  ensureAccessToken: (...args: unknown[]) => ensureAccessTokenMock(...args),
  buildAuthorizationHeader: (...args: unknown[]) => buildAuthorizationHeaderMock(...args)
}));

vi.mock('@/utils/retry', () => ({
  withRetry: <T>(operation: () => Promise<T>) => operation()
}));

import { httpClient } from '@/lib/httpClient';
import { Preferences } from '@capacitor/preferences';
import { appConfig } from '@/config/appConfig';
import { checkAppVersion, clearCachedVersionCheck, getCachedVersionCheck } from '@/services/version';

const httpClientMock = vi.mocked(httpClient, true);
const preferencesMock = vi.mocked(Preferences, true);

const mutableConfig = appConfig as unknown as {
  apiBaseUrl: string;
  version: {
    cacheKey: string;
    cacheTtlMs: number;
    fallbackBuild: string;
    fallbackVersion: string;
  };
};

beforeEach(async () => {
  platformRef.current = 'android';
  Object.keys(preferenceStore).forEach((key) => delete preferenceStore[key]);
  httpGetMock.mockReset();
  httpClientMock.get.mockClear();
  appInfoMock.mockReset();
  ensureAccessTokenMock.mockReset();
  buildAuthorizationHeaderMock.mockReset();
  preferencesMock.get.mockClear();
  preferencesMock.set.mockClear();
  preferencesMock.remove.mockClear();
  mutableConfig.apiBaseUrl = 'https://api.test';
  mutableConfig.version.cacheKey = 'gmast::version-check';
  mutableConfig.version.cacheTtlMs = 5 * 60 * 1000;
  mutableConfig.version.fallbackBuild = '';
  mutableConfig.version.fallbackVersion = '';
  appInfoMock.mockResolvedValue({ version: '1.0.0', build: '100' });
  ensureAccessTokenMock.mockResolvedValue({ token: 'abc', tokenType: 'Bearer' });
  buildAuthorizationHeaderMock.mockReturnValue('Bearer abc');
  await clearCachedVersionCheck();
});

describe('versionCheckService', () => {
  it('returns unsupported snapshot on non-native platform', async () => {
    platformRef.current = 'web';

    const snapshot = await checkAppVersion();

    expect(snapshot.status).toBe('unsupported');
    expect(snapshot.reason).toBe('unsupported-platform');
    expect(httpClientMock.get).not.toHaveBeenCalled();
  });

  it('uses cached snapshot when still fresh', async () => {
    httpGetMock.mockResolvedValue({
      data: {
        requiredBuild: '100',
        latestBuild: '100'
      }
    });

    const first = await checkAppVersion();
    expect(first.status).toBe('supported');
    expect(httpClientMock.get).toHaveBeenCalledTimes(1);

    httpClientMock.get.mockClear();

    const second = await checkAppVersion();
    expect(second.status).toBe('supported');
    expect(httpClientMock.get).not.toHaveBeenCalled();
  });

  it('marks snapshot blocked when build is below required', async () => {
    httpGetMock.mockResolvedValue({
      data: {
        requiredBuild: '200',
        latestBuild: '220'
      }
    });

    const snapshot = await checkAppVersion({ forceRefresh: true });

    expect(snapshot.status).toBe('blocked');
    expect(snapshot.reason).toBe('required-build-mismatch');
    expect(snapshot.requiredBuild).toBe('200');
    expect(httpClientMock.get).toHaveBeenCalledWith('/app-version', {
      headers: expect.objectContaining({ Authorization: 'Bearer abc' }),
      params: expect.objectContaining({ platform: 'android', build: '100' })
    });
  });

  it('marks update available when below latest but above required', async () => {
    httpGetMock.mockResolvedValue({
      data: {
        requiredBuild: '90',
        latestBuild: '150'
      }
    });
    appInfoMock.mockResolvedValue({ version: '1.0.0', build: '120' });

    const snapshot = await checkAppVersion({ forceRefresh: true });

    expect(snapshot.status).toBe('update-available');
    expect(snapshot.reason).toBe('newer-build-available');
  });

  it('falls back to cached snapshot when network fails', async () => {
    httpGetMock.mockResolvedValueOnce({
      data: {
        requiredBuild: '100',
        latestBuild: '100'
      }
    });

    await checkAppVersion({ forceRefresh: true });

    httpGetMock.mockRejectedValueOnce(new Error('offline'));

    const snapshot = await checkAppVersion({ forceRefresh: true });

    expect(snapshot.reason).toBe('using-cached-result');
    expect(snapshot.status).toBe('supported');
  });

  it('returns unknown snapshot when API base URL is missing', async () => {
    mutableConfig.apiBaseUrl = '';

    const snapshot = await checkAppVersion({ forceRefresh: true });

    expect(snapshot.status).toBe('unknown');
    expect(snapshot.reason).toBe('missing-api-base-url');
    expect(httpClientMock.get).not.toHaveBeenCalled();
  });
});
