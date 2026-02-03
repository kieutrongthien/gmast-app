export type VersionPlatform = 'android' | 'ios' | 'web' | 'unknown';

export type VersionCheckStatus =
  | 'unknown'
  | 'unsupported'
  | 'supported'
  | 'update-available'
  | 'blocked';

export type VersionCheckReason =
  | 'unsupported-platform'
  | 'missing-api-base-url'
  | 'missing-app-info'
  | 'missing-required-version'
  | 'network-error'
  | 'required-build-mismatch'
  | 'newer-build-available'
  | 'using-cached-result';

export interface VersionCheckSnapshot {
  status: VersionCheckStatus;
  reason?: VersionCheckReason;
  platform: VersionPlatform;
  currentVersion: string | null;
  currentBuild: string | null;
  requiredVersion: string | null;
  requiredBuild: string | null;
  latestVersion: string | null;
  latestBuild: string | null;
  message?: string | null;
  changelog?: string | null;
  downloadUrl?: string | null;
  gracePeriodHours?: number | null;
  expiresAt?: string | null;
  updatedAt?: string | null;
  fetchedAt: string;
}

export interface VersionCheckOptions {
  forceRefresh?: boolean;
  useCache?: boolean;
  persist?: boolean;
}
