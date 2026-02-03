import { ref } from 'vue';
import type { VersionCheckSnapshot } from '@/types/version';
import { checkAppVersion, getCachedVersionCheck } from '@/services/version/versionCheckService';

const snapshotState = ref<VersionCheckSnapshot | null>(null);
const loadingState = ref(false);
const errorState = ref<string | null>(null);

let inflightPromise: Promise<VersionCheckSnapshot> | null = null;

const assignSnapshot = (snapshot: VersionCheckSnapshot): VersionCheckSnapshot => {
  snapshotState.value = snapshot;
  return snapshot;
};

const withInFlight = (
  worker: () => Promise<VersionCheckSnapshot>
): Promise<VersionCheckSnapshot> => {
  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    try {
      return await worker();
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
};

const runCheck = (options?: { forceRefresh?: boolean; useCache?: boolean }) =>
  withInFlight(async () => {
    loadingState.value = true;
    errorState.value = null;
    try {
      const snapshot = await checkAppVersion(options);
      return assignSnapshot(snapshot);
    } catch (error) {
      errorState.value = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      loadingState.value = false;
    }
  });

export const ensureVersionGateSnapshot = async (): Promise<VersionCheckSnapshot> => {
  if (snapshotState.value) {
    return snapshotState.value;
  }

  const cached = await getCachedVersionCheck();
  if (cached) {
    return assignSnapshot(cached);
  }

  return runCheck();
};

export const refreshVersionGateSnapshot = async (): Promise<VersionCheckSnapshot> =>
  runCheck({ forceRefresh: true, useCache: false });

export const versionGateState = {
  snapshot: snapshotState,
  loading: loadingState,
  error: errorState
};

export const resetVersionGateState = (): void => {
  snapshotState.value = null;
  errorState.value = null;
};
