import { computed, ref } from 'vue';
import type { Ref } from 'vue';
import type { SimInventorySnapshot, SimSlotMetadata } from '@/types/sim';
import type { SimSelectionMode } from '@/types/send';
import { readSimInventory } from '@/services/sim';
import {
  getDefaultSendConfig,
  getSendConfig,
  subscribeToSendConfig,
  updateSendConfig
} from '@/services/messages/sendConfigService';

const modeState: Ref<SimSelectionMode> = ref(getDefaultSendConfig().simMode);
const slotIdState: Ref<string | null> = ref(getDefaultSendConfig().simSlotId);
const loadingState = ref(false);
const errorState = ref<string | null>(null);
const inventoryState: Ref<SimInventorySnapshot | null> = ref(null);
const initializedState = ref(false);
const initializingPromise: { current: Promise<void> | null } = { current: null };
let unsubscribe: (() => void) | null = null;

const preferredSlot = (slots: SimSlotMetadata[]): SimSlotMetadata | null => {
  if (!slots.length) {
    return null;
  }
  return slots.find((slot) => slot.state === 'ready') ?? slots[0];
};

const ensureInitialized = async (): Promise<void> => {
  if (initializedState.value) {
    return;
  }

  if (initializingPromise.current) {
    await initializingPromise.current;
    return;
  }

  initializingPromise.current = (async () => {
    const config = await getSendConfig();
    modeState.value = config.simMode;
    slotIdState.value = config.simSlotId;
    unsubscribe = subscribeToSendConfig((next) => {
      modeState.value = next.simMode;
      slotIdState.value = next.simSlotId;
    });
    initializedState.value = true;
  })();

  try {
    await initializingPromise.current;
  } finally {
    initializingPromise.current = null;
  }
};

const persistSelection = async (): Promise<void> => {
  await updateSendConfig({
    simMode: modeState.value,
    simSlotId: slotIdState.value
  });
};

const reconcileSelection = async (slots: SimSlotMetadata[]): Promise<void> => {
  if (modeState.value !== 'manual') {
    return;
  }

  const hasMatch = slots.some((slot) => slot.id === slotIdState.value);
  if (!hasMatch) {
    const fallback = preferredSlot(slots);
    slotIdState.value = fallback?.id ?? null;
    await persistSelection();
  }
};

const refreshInventory = async (): Promise<void> => {
  await ensureInitialized();
  loadingState.value = true;
  errorState.value = null;
  try {
    const snapshot = await readSimInventory({ requestPermission: true });
    inventoryState.value = snapshot;
    await reconcileSelection(snapshot.slots);
  } catch (error) {
    errorState.value = error instanceof Error ? error.message : String(error);
  } finally {
    loadingState.value = false;
  }
};

const setMode = async (mode: SimSelectionMode): Promise<void> => {
  await ensureInitialized();
  if (modeState.value === mode) {
    return;
  }
  modeState.value = mode;

  if (mode === 'random') {
    slotIdState.value = null;
  } else if (!slotIdState.value && inventoryState.value) {
    const fallback = preferredSlot(inventoryState.value.slots);
    slotIdState.value = fallback?.id ?? null;
  }

  await persistSelection();
};

const selectSlot = async (slotId: string | null): Promise<void> => {
  await ensureInitialized();
  if (modeState.value !== 'manual') {
    modeState.value = 'manual';
  }
  slotIdState.value = slotId;
  await persistSelection();
};

const selectedSlot = computed(() =>
  inventoryState.value?.slots.find((slot) => slot.id === slotIdState.value) ?? null
);

const slots = computed(() => inventoryState.value?.slots ?? []);
const status = computed(() => inventoryState.value?.status ?? 'unsupported');
const permission = computed(() => inventoryState.value?.permission ?? 'prompt');
const platform = computed(() => inventoryState.value?.platform ?? 'unknown');
const pluginVersion = computed(() => inventoryState.value?.pluginVersion ?? null);
const statusReason = computed(() => inventoryState.value?.reason);
const lastFetchedAt = computed(() => inventoryState.value?.fetchedAt ?? null);

export const useSimSelection = () => {
  const initialize = async (): Promise<void> => {
    await ensureInitialized();
    if (!inventoryState.value) {
      await refreshInventory();
    }
  };

  return {
    mode: modeState,
    selectedSlotId: slotIdState,
    selectedSlot,
    slots,
    status,
    permission,
    platform,
    pluginVersion,
    statusReason,
    lastFetchedAt,
    loading: loadingState,
    errorMessage: errorState,
    initialize,
    refreshInventory,
    setMode,
    selectSlot
  };
};

export const __resetSimSelectionForTests = () => {
  initializedState.value = false;
  inventoryState.value = null;
  loadingState.value = false;
  errorState.value = null;
  modeState.value = getDefaultSendConfig().simMode;
  slotIdState.value = getDefaultSendConfig().simSlotId;
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};
