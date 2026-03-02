<template>
  <ion-modal :is-open="isOpen" class="sim-inventory-modal" @didDismiss="handleDismiss">
    <ion-header translucent>
      <ion-toolbar>
        <ion-title>{{ t('sim.sheet.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" size="small" @click="handleDismiss" data-test="close-button">
            <ion-icon :icon="closeOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="sheet-content">
      <div class="sheet-meta">
        <div class="meta-group">
          <p><strong>{{ t('sim.sheet.status') }}:</strong> {{ statusLabel }}</p>
          <p><strong>{{ t('sim.sheet.permission') }}:</strong> {{ permissionLabel }}</p>
          <p><strong>{{ t('sim.sheet.platform') }}:</strong> {{ platformLabel }}</p>
          <p v-if="pluginVersion"><strong>{{ t('sim.sheet.plugin') }}:</strong> v{{ pluginVersion }}</p>
          <p v-if="reason" class="meta-note">{{ reasonLabel }}</p>
        </div>
        <ion-button
          size="small"
          :disabled="loading"
          @click="handleRefresh"
          data-test="refresh-button"
        >
          <ion-icon slot="start" :icon="refreshOutline" />
          {{ t('sim.sheet.scanAgain') }}
        </ion-button>
      </div>

      <div v-if="loading" class="sheet-state">
        <ion-spinner name="crescent" />
        <p>{{ t('sim.sheet.loading') }}</p>
      </div>
      <div v-else-if="errorMessage" class="sheet-state state-warning">
        <ion-icon :icon="alertCircleOutline" />
        <p>{{ errorMessage }}</p>
      </div>
      <div v-else-if="status === 'permission-denied'" class="sheet-state state-warning">
        <ion-icon :icon="alertCircleOutline" />
        <p>{{ t('sim.sheet.permissionHint') }}</p>
      </div>
      <div v-else-if="status === 'unsupported'" class="sheet-state state-muted">
        <ion-icon :icon="alertCircleOutline" />
        <p>{{ t('sim.sheet.unsupported') }}</p>
      </div>
      <ion-list v-else-if="slots.length" lines="full" class="slot-inventory">
        <ion-item
          v-for="slot in slots"
          :key="slot.id"
          :class="['slot-item', { 'slot-item--inactive': slot.state !== 'ready' }]"
          data-test="sim-slot"
        >
          <ion-icon :icon="cellularOutline" slot="start" />
          <ion-label>
            <h3>{{ slot.label }}</h3>
            <p>
              {{ slot.carrierName || t('sim.sheet.unknownCarrier') }} ·
              {{ formatPhone(slot.phoneNumber) }}
            </p>
            <p class="slot-meta">
              {{
                t('sim.sheet.slotMeta', {
                  slot: slot.slotIndex ?? '—',
                  mcc: slot.mobileCountryCode || '--',
                  mnc: slot.mobileNetworkCode || '--'
                })
              }}
            </p>
          </ion-label>
          <ion-badge :color="badgeColor(slot.state)">{{ slotStateLabel(slot.state) }}</ion-badge>
        </ion-item>
      </ion-list>
      <div v-else class="sheet-state state-muted">
        <ion-icon :icon="alertCircleOutline" />
        <p>{{ t('sim.sheet.noSim') }}</p>
      </div>

      <ion-note v-if="lastFetchedAt" class="fetched-note">
        {{ t('sim.sheet.fetchedAt', { time: fetchedLabel }) }}
      </ion-note>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import type { PermissionState } from '@capacitor/core';
import { alertCircleOutline, cellularOutline, closeOutline, refreshOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SimInventoryStatus, SimPlatform, SimSlotMetadata, SimSlotState } from '@/types/sim';

const { t, locale } = useI18n();

interface Props {
  isOpen: boolean;
  slots: SimSlotMetadata[];
  status: SimInventoryStatus;
  permission: PermissionState;
  platform: SimPlatform;
  pluginVersion?: string | null;
  reason?: string;
  lastFetchedAt: string | null;
  loading: boolean;
  errorMessage?: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  refresh: [];
}>();

const statusLabel = computed(() => {
  switch (props.status) {
    case 'ready':
      return t('sim.sheet.statusLabel.ready');
    case 'permission-denied':
      return t('sim.sheet.statusLabel.denied');
    default:
      return t('sim.sheet.statusLabel.unsupported');
  }
});

const permissionLabel = computed(() => {
  switch (props.permission) {
    case 'granted':
      return t('sim.sheet.permissionLabel.granted');
    case 'denied':
      return t('sim.sheet.permissionLabel.denied');
    case 'prompt-with-rationale':
      return t('sim.sheet.permissionLabel.rationale');
    case 'prompt':
    default:
      return t('sim.sheet.permissionLabel.prompt');
  }
});

const platformLabel = computed(() => {
  switch (props.platform) {
    case 'android':
      return t('sim.sheet.platformLabel.android');
    case 'ios':
      return t('sim.sheet.platformLabel.ios');
    case 'web':
      return t('sim.sheet.platformLabel.web');
    default:
      return t('sim.sheet.platformLabel.unknown');
  }
});

const reasonLabel = computed(() => props.reason === 'ios-carrier-restrictions'
  ? t('sim.sheet.reasonIosRestrictions')
  : props.reason ?? ''
);

const fetchedLabel = computed(() => {
  if (!props.lastFetchedAt) {
    return t('sim.selector.fallbackFetchedAt');
  }
  const date = new Date(props.lastFetchedAt);
  if (Number.isNaN(date.getTime())) {
    return props.lastFetchedAt;
  }
  return date.toLocaleTimeString(locale.value === 'ko' ? 'ko-KR' : 'en-US');
});

const slotStateLabel = (state: SimSlotState): string => {
  switch (state) {
    case 'ready':
      return t('sim.sheet.slotState.ready');
    case 'empty':
      return t('sim.sheet.slotState.empty');
    default:
      return t('sim.sheet.slotState.unknown');
  }
};

const badgeColor = (state: SimSlotState): 'success' | 'medium' | 'warning' => {
  if (state === 'ready') {
    return 'success';
  }
  if (state === 'empty') {
    return 'medium';
  }
  return 'warning';
};

const formatPhone = (value?: string): string => {
  if (!value) {
    return t('sim.sheet.noPhone');
  }
  return value;
};

const handleDismiss = () => {
  emit('close');
};

const handleRefresh = () => {
  emit('refresh');
};
</script>

<style scoped>
.sim-inventory-modal {
  --width: min(520px, 92vw);
  --height: 85vh;
}

.sheet-content {
  --padding-top: 1rem;
  --padding-bottom: 1.5rem;
}

.sheet-meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
}

.meta-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.9rem;
}

.meta-note {
  color: var(--ion-color-warning);
}

.sheet-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  padding: 2rem 1rem;
  color: var(--ion-color-step-600);
}

.sheet-state ion-icon {
  font-size: 1.5rem;
}

.state-warning {
  color: #b26a00;
}

.state-muted {
  color: var(--ion-color-step-600);
}

.slot-item {
  --padding-start: 1rem;
  --padding-end: 1rem;
  transition: opacity 0.2s ease;
}

.slot-item--inactive {
  opacity: 0.55;
}

.slot-inventory h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.slot-inventory p {
  margin: 0.15rem 0;
  font-size: 0.85rem;
  color: var(--ion-color-step-600);
}

.slot-meta {
  font-size: 0.8rem;
}

.fetched-note {
  display: block;
  margin: 1rem;
  text-align: right;
  font-size: 0.85rem;
}

@media (max-width: 480px) {
  .sheet-meta {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
