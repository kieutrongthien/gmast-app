<template>
  <section class="sim-selector-card dashboard-panel-card">
    <div class="sim-selector-surface">
      <header class="sim-selector-header">
        <h3>{{ t('sim.selector.title') }}</h3>
        <p>{{ selectionSummary }}</p>
      </header>
      <div class="sim-selector-content">
        <div class="mode-row">
          <ion-segment
            :value="mode"
            :disabled="loading"
            @ionChange="handleModeChange"
          >
            <ion-segment-button value="manual">
              <ion-label>{{ t('sim.selector.modeManual') }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="random">
              <ion-label>{{ t('sim.selector.modeRandom') }}</ion-label>
            </ion-segment-button>
          </ion-segment>
          <ion-button
            fill="clear"
            size="small"
            :disabled="loading"
            @click="handleRefresh"
          >
            <ion-icon slot="start" :icon="refreshOutline" />
            {{ t('sim.selector.scanAgain') }}
          </ion-button>
          <ion-button
            fill="clear"
            size="small"
            :disabled="loading"
            @click="handleOpenSheet"
          >
            <ion-icon slot="start" :icon="cellularOutline" />
            {{ t('sim.selector.details') }}
          </ion-button>
        </div>

        <div v-if="loading" class="loading-row">
          <ion-spinner name="crescent" />
          <span>{{ t('sim.selector.loading') }}</span>
        </div>

        <template v-else>
          <div v-if="errorMessage" class="notice notice-warning">
            <ion-icon :icon="alertCircleOutline" />
            <p>{{ errorMessage }}</p>
          </div>
          <div v-else-if="status === 'permission-denied'" class="notice notice-warning">
            <ion-icon :icon="alertCircleOutline" />
            <p>
              {{ t('sim.selector.permissionHint') }}
            </p>
          </div>
          <div v-else-if="status === 'unsupported'" class="notice notice-muted">
            <ion-icon :icon="alertCircleOutline" />
            <p>{{ t('sim.selector.unsupported') }}</p>
          </div>
          <div v-else-if="!slots.length" class="notice notice-muted">
            <ion-icon :icon="alertCircleOutline" />
            <p>{{ t('sim.selector.noSim') }}</p>
          </div>
          <div v-else class="slot-list">
            <ion-radio-group
              :value="selectedSlotId"
              @ionChange="handleSlotChange"
              :disabled="mode !== 'manual'"
            >
              <ion-item v-for="slot in slots" :key="slot.id" lines="none">
                <ion-radio slot="start" :value="slot.id" :disabled="mode !== 'manual'" />
                <ion-label>
                  <p class="slot-label">
                    {{ slot.label }}
                    <span v-if="slot.state !== 'ready'" class="slot-state">({{ slotStateLabel(slot.state) }})</span>
                  </p>
                  <p class="slot-meta">
                    {{ slot.carrierName || t('sim.selector.unknownCarrier') }} · MCC {{ slot.mobileCountryCode || '--' }} / MNC
                    {{ slot.mobileNetworkCode || '--' }}
                  </p>
                </ion-label>
              </ion-item>
            </ion-radio-group>
          </div>
        </template>

        <ion-note color="medium" v-if="lastFetchedAt" class="fetched-at">
          {{ t('sim.selector.fetchedAt', { time: fetchedLabel }) }}
        </ion-note>
      </div>
    </div>
  </section>
  <sim-inventory-sheet
    :is-open="inventorySheetOpen"
    :slots="slots"
    :status="status"
    :permission="permission"
    :platform="platform"
    :plugin-version="pluginVersion"
    :reason="statusReason"
    :last-fetched-at="lastFetchedAt"
    :loading="loading"
    :error-message="errorMessage"
    @close="handleCloseSheet"
    @refresh="handleSheetRefresh"
  />
</template>

<script setup lang="ts">
import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonSegment,
  IonSegmentButton,
  IonSpinner
} from '@ionic/vue';
import type { RadioGroupChangeEventDetail, SegmentChangeEventDetail } from '@ionic/core';
import { alertCircleOutline, cellularOutline, refreshOutline } from 'ionicons/icons';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSimSelection } from '@/composables/useSimSelection';
import type { SimSelectionMode } from '@/types/send';
import type { SimSlotState } from '@/types/sim';
import SimInventorySheet from '@/components/SimInventorySheet.vue';

const { t, locale } = useI18n();

const {
  mode,
  selectedSlotId,
  selectedSlot,
  slots,
  status,
  permission,
  platform,
  pluginVersion,
  statusReason,
  lastFetchedAt,
  loading,
  errorMessage,
  initialize,
  refreshInventory,
  setMode,
  selectSlot
} = useSimSelection();

const inventorySheetOpen = ref(false);

const handleModeChange = async (
  event: CustomEvent<SegmentChangeEventDetail>
): Promise<void> => {
  const next = event.detail.value as SimSelectionMode;
  await setMode(next);
};

const handleSlotChange = async (event: CustomEvent<RadioGroupChangeEventDetail>): Promise<void> => {
  const value = event.detail.value as string | null;
  if (value) {
    await selectSlot(value);
  }
};

const handleRefresh = async (): Promise<void> => {
  await refreshInventory();
};

const handleOpenSheet = (): void => {
  inventorySheetOpen.value = true;
};

const handleCloseSheet = (): void => {
  inventorySheetOpen.value = false;
};

const handleSheetRefresh = async (): Promise<void> => {
  await refreshInventory();
};

const slotStateLabel = (state: SimSlotState): string => {
  switch (state) {
    case 'ready':
      return t('sim.selector.state.ready');
    case 'empty':
      return t('sim.selector.state.empty');
    default:
      return t('sim.selector.state.unknown');
  }
};

const selectionSummary = computed(() => {
  if (mode.value === 'random' || !selectedSlot.value) {
    return t('sim.selector.summaryRandom');
  }
  return t('sim.selector.summaryManual', { label: selectedSlot.value.label });
});

const fetchedLabel = computed(() => {
  if (!lastFetchedAt.value) {
    return t('sim.selector.fallbackFetchedAt');
  }
  const date = new Date(lastFetchedAt.value);
  if (Number.isNaN(date.getTime())) {
    return lastFetchedAt.value;
  }
  return date.toLocaleTimeString(locale.value === 'ko' ? 'ko-KR' : 'en-US');
});

onMounted(() => {
  initialize();
});
</script>

<style scoped>
.sim-selector-card {
  margin-bottom: 1rem;
  --sim-card-text: var(--ion-text-color, #f8fafc);
  --sim-card-text-muted: var(--dashboard-text-secondary, var(--ion-color-step-600, #94a3b8));
  --sim-card-border: var(--dashboard-border, rgba(148, 163, 184, 0.25));
  --sim-item-bg: var(--dashboard-surface, rgba(15, 23, 42, 0.7));
  --sim-warning-bg: rgba(var(--ion-color-warning-rgb, 245, 158, 11), 0.2);
  --sim-warning-text: var(--ion-color-warning-shade, #b45309);
  --sim-muted-bg: rgba(148, 163, 184, 0.14);
  color: var(--sim-card-text);
}

.sim-selector-surface {
  display: flex;
  flex-direction: column;
}

.sim-selector-header {
  padding: 1rem 1rem 0.5rem;
}

.sim-selector-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.sim-selector-header p {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: var(--sim-card-text-muted);
}

.sim-selector-content {
  padding: 0.5rem 1rem 1rem;
}

.mode-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.mode-row ion-segment {
  --background: var(--sim-item-bg);
  border: 1px solid var(--sim-card-border);
  border-radius: 0.75rem;
}

.mode-row ion-segment-button {
  --color: var(--sim-card-text-muted);
  --color-checked: var(--sim-card-text);
  --background-checked: rgba(var(--ion-color-primary-rgb, 34, 197, 94), 0.2);
  --indicator-color: transparent;
  min-height: 40px;
}

.loading-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: var(--sim-card-text-muted);
}

.slot-list ion-item {
  --padding-start: 0.5rem;
  --padding-end: 0.25rem;
  --background: var(--sim-item-bg);
  --color: var(--sim-card-text);
  border: 1px solid var(--sim-card-border);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.slot-label {
  margin: 0;
  font-weight: 600;
}

.slot-meta {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--sim-card-text-muted);
}

.slot-state {
  font-weight: 400;
  font-size: 0.85rem;
  margin-left: 0.35rem;
  color: var(--ion-color-warning);
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.notice-warning {
  background: var(--sim-warning-bg);
  color: var(--sim-warning-text);
}

.notice-muted {
  background: var(--sim-muted-bg);
  color: var(--sim-card-text-muted);
}

.notice p {
  margin: 0;
  font-size: 0.9rem;
}

.fetched-at {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--sim-card-text-muted);
}
</style>
