import { computed, onMounted } from 'vue';
import {
  ensureVersionGateSnapshot,
  refreshVersionGateSnapshot,
  versionGateState
} from '@/services/version/versionGateController';

export const useVersionGate = () => {
  const snapshot = computed(() => versionGateState.snapshot.value);
  const isBlocked = computed(() => snapshot.value?.status === 'blocked');
  const isUpdateAvailable = computed(() => snapshot.value?.status === 'update-available');
  const loading = computed(() => versionGateState.loading.value);
  const errorMessage = computed(() => versionGateState.error.value);

  const initialize = async (): Promise<void> => {
    try {
      await ensureVersionGateSnapshot();
    } catch (error) {
      console.warn('[version-gate] failed to fetch snapshot', error);
    }
  };

  const retry = async (): Promise<void> => {
    await refreshVersionGateSnapshot();
  };

  onMounted(() => {
    initialize();
  });

  return {
    snapshot,
    isBlocked,
    isUpdateAvailable,
    loading,
    errorMessage,
    initialize,
    retry
  };
};
