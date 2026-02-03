import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VersionCheckSnapshot } from '@/types/version';

const checkAppVersion = vi.fn();
const getCachedVersionCheck = vi.fn();

vi.mock('@/services/version/versionCheckService', () => ({
  checkAppVersion: (...args: unknown[]) => checkAppVersion(...args),
  getCachedVersionCheck: (...args: unknown[]) => getCachedVersionCheck(...args)
}));

describe('versionGateController', () => {
  beforeEach(() => {
    vi.resetModules();
    checkAppVersion.mockReset();
    getCachedVersionCheck.mockReset();
  });

  const buildSnapshot = (overrides: Partial<VersionCheckSnapshot> = {}): VersionCheckSnapshot => ({
    status: 'supported',
    platform: 'android',
    reason: undefined,
    currentVersion: '1.0.0',
    currentBuild: '100',
    requiredVersion: '1.0.0',
    requiredBuild: '100',
    latestVersion: '1.0.0',
    latestBuild: '100',
    message: null,
    changelog: null,
    downloadUrl: null,
    gracePeriodHours: null,
    expiresAt: null,
    updatedAt: null,
    fetchedAt: new Date().toISOString(),
    ...overrides
  });

  it('returns cached snapshot without hitting network', async () => {
    const cached = buildSnapshot({ status: 'blocked' });
    getCachedVersionCheck.mockResolvedValue(cached);
    const { ensureVersionGateSnapshot } = await import('@/services/version/versionGateController');

    const snapshot = await ensureVersionGateSnapshot();

    expect(snapshot).toEqual(cached);
    expect(checkAppVersion).not.toHaveBeenCalled();
  });

  it('fetches snapshot when cache missing', async () => {
    const fetched = buildSnapshot({ status: 'supported' });
    getCachedVersionCheck.mockResolvedValue(null);
    checkAppVersion.mockResolvedValue(fetched);
    const { ensureVersionGateSnapshot } = await import('@/services/version/versionGateController');

    const snapshot = await ensureVersionGateSnapshot();

    expect(snapshot).toEqual(fetched);
    expect(checkAppVersion).toHaveBeenCalledTimes(1);
  });

  it('forces refresh on retry', async () => {
    const initial = buildSnapshot({ status: 'blocked' });
    const refreshed = buildSnapshot({ status: 'supported', fetchedAt: new Date().toISOString() });
    getCachedVersionCheck.mockResolvedValueOnce(null);
    checkAppVersion.mockResolvedValueOnce(initial).mockResolvedValueOnce(refreshed);
    const { ensureVersionGateSnapshot, refreshVersionGateSnapshot } = await import(
      '@/services/version/versionGateController'
    );

    await ensureVersionGateSnapshot();
    const result = await refreshVersionGateSnapshot();

    expect(result).toEqual(refreshed);
    expect(checkAppVersion).toHaveBeenCalledTimes(2);
    expect(checkAppVersion).toHaveBeenLastCalledWith({ forceRefresh: true, useCache: false });
  });
});
