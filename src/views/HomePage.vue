<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ t('home.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" :disabled="loading" @click="handleManualRefresh">
            <ion-icon :icon="refreshOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content
          :pulling-text="t('home.refresherPulling')"
          refreshing-spinner="crescent"
          :refreshing-text="t('home.refresherLoading')"
        />
      </ion-refresher>

      <section class="dashboard-hero">
        <div class="hero-text">
          <p class="hero-eyebrow">{{ t('home.heroEyebrow') }}</p>
          <div class="hero-heading">
            <h3>{{ t('home.heroTitle') }}</h3>
            <ion-chip color="success" class="hero-chip">
              <ion-icon :icon="cloudOfflineOutline" />
              <ion-label>{{ t('home.heroPendingCount', { count: totalItems }) }}</ion-label>
            </ion-chip>
          </div>
          <p class="hero-subtitle">
            {{ t('home.heroSubtitle') }}
          </p>
        </div>
        <div class="hero-actions">
          <ion-button color="primary" :disabled="loading" @click="handleManualRefresh">
            <ion-icon :icon="refreshOutline" slot="start" />
            {{ t('home.scanQueue') }}
          </ion-button>
          <ion-chip color="medium" v-if="usingMock">{{ t('home.mockData') }}</ion-chip>
          <ion-chip color="danger" v-if="error">
            <ion-icon :icon="warningOutline" />
            <ion-label>{{ t('home.apiError') }}</ion-label>
          </ion-chip>
        </div>
      </section>

      <section class="panel primary-panel dashboard-panel-card">
        <div class="panel-header">
          <div>
            <p class="panel-eyebrow">{{ t('home.panelEyebrow') }}</p>
            <div class="panel-title-row">
              <h3>{{ t('home.panelTitle') }}</h3>
              <ion-select
                :value="activeSegment"
                class="queue-filter-select"
                interface="popover"
                :label="t('home.filterLabel')"
                label-placement="stacked"
                @ionChange="handleFilterChange"
              >
                <ion-select-option v-for="tab in queueTabs" :key="tab.id" :value="tab.id">
                  {{ t(tab.labelKey) }} ({{ tab.count }})
                </ion-select-option>
              </ion-select>
            </div>
          </div>
          <div class="panel-updated">
            <ion-icon :icon="alertCircleOutline" />
            <span>{{ t('home.updated', { value: lastUpdatedLabel }) }}</span>
          </div>
        </div>

        <div class="queue-notes" v-if="hasResultFailures">
          <ion-chip color="danger" button @click="handleRetryResultSync">
            <ion-icon :icon="cloudOfflineOutline" />
            <ion-label>{{ t('home.syncErrorChip', { count: failedResultCount }) }}</ion-label>
          </ion-chip>
        </div>

        <queue-list
          :items="filteredMessages"
          class="queue-list-section"
        />
        <div class="status-loading" v-if="loading">
          <ion-spinner name="crescent" />
          <span>{{ t('home.syncing') }}</span>
        </div>
      </section>

      <ion-toast
        :is-open="resultToastOpen"
        :message="resultToastMessage"
        :buttons="resultToastButtons"
        color="danger"
        position="top"
        :duration="0"
        @didDismiss="handleToastDismiss"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar
} from '@ionic/vue';
import type { RefresherCustomEvent, SelectChangeEventDetail } from '@ionic/core';
import { alertCircleOutline, cloudOfflineOutline, refreshOutline, warningOutline } from 'ionicons/icons';
import { onMounted, computed, ref, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import QueueList from '@/components/QueueList.vue';
import { usePendingQueue } from '@/composables/usePendingQueue';
import { useResultSync } from '@/composables/useResultSync';
import type { QueueMessage } from '@/types/queue';

const { t } = useI18n();

const {
  messages,
  meta,
  loading,
  error,
  lastUpdated,
  usingMock,
  loadQueue,
  refreshQueue,
  startAutoRefresh
} = usePendingQueue();

let stopAutoRefresh: (() => void) | null = null;

const {
  failureCount,
  hasFailures,
  toastOpen,
  lastErrorMessage,
  hydrateFailures,
  retryFailedResults,
  dismissToast
} = useResultSync();

const failedResultCount = failureCount;
const hasResultFailures = hasFailures;
const resultToastOpen = toastOpen;
const resultToastMessage = computed(() => {
  if (failureCount.value <= 1) {
    return t('home.resultSync.oneFailed', { message: lastErrorMessage.value });
  }
  return t('home.resultSync.multipleFailed', { count: failureCount.value });
});

const activeSegment = ref('all');

const totalItems = computed(() => {
  return messages.value.filter(x => x.status === 'pending').length;
});

type SegmentFilter = (message: QueueMessage) => boolean;
interface SegmentDefinition {
  id: string;
  labelKey: string;
  filter: SegmentFilter;
}

const segmentDefinitions: SegmentDefinition[] = [
  { id: 'all', labelKey: 'home.statuses.all', filter: () => true },
  {
    id: 'pending',
    labelKey: 'home.statuses.pending',
    filter: (message) => message.status === 'pending'
  },
  {
    id: 'processing',
    labelKey: 'home.statuses.processing',
    filter: (message) => message.status === 'processing'
  },
  { id: 'failed', labelKey: 'home.statuses.failed', filter: (message) => message.status === 'failed' }
];

const queueTabs = computed(() =>
  segmentDefinitions.map((segment) => ({
    ...segment,
    count: messages.value.filter(segment.filter).length
  }))
);

const filteredMessages = computed(() => {
  const active = segmentDefinitions.find((segment) => segment.id === activeSegment.value);
  const predicate = active?.filter ?? (() => true);
  return messages.value.filter(predicate);
});

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) {
    return t('home.noData');
  }
  const updatedDate = new Date(lastUpdated.value);
  if (Number.isNaN(updatedDate.getTime())) {
    return lastUpdated.value;
  }
  const diffMs = Date.now() - updatedDate.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) {
    return t('home.justNow');
  }
  if (diffMinutes < 60) {
    return t('home.minutesAgo', { count: diffMinutes });
  }
  const diffHours = Math.round(diffMinutes / 60);
  return t('home.hoursAgo', { count: diffHours });
});

const handleFilterChange = (event: CustomEvent<SelectChangeEventDetail>) => {
  const next = event.detail.value as string;
  activeSegment.value = next;
};

const handleRefresh = async (event: RefresherCustomEvent) => {
  await refreshQueue(true);
  event.target.complete();
};

const handleManualRefresh = async () => {
  await refreshQueue(true);
};

const handleRetryResultSync = async () => {
  await retryFailedResults();
};

const handleToastDismiss = () => {
  dismissToast();
};

const resultToastButtons = [
  {
    text: t('common.retry'),
    handler: () => {
      handleRetryResultSync();
      return false;
    }
  },
  {
    text: t('common.close'),
    role: 'cancel',
    handler: () => {
      dismissToast();
    }
  }
];

onMounted(() => {
  void loadQueue({ force: true });
  hydrateFailures();
  stopAutoRefresh = startAutoRefresh();
});

onBeforeUnmount(() => {
  stopAutoRefresh?.();
});
</script>

<style scoped>
ion-content {
  --padding-top: 2.5rem;
  --padding-bottom: calc(2rem + var(--app-safe-area-bottom, 0px));
  --padding-start: clamp(1rem, 4vw, 3rem);
  --padding-end: clamp(1rem, 4vw, 3rem);
  background: radial-gradient(circle at top left, rgba(var(--ion-color-primary-rgb, 37, 99, 235), 0.25), transparent 45%),
    var(--ion-background-color);
}

.dashboard-hero {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 1.5rem;
  border-radius: 0.95rem;
  background: var(--dashboard-surface);
  border: 1px solid var(--dashboard-border);
  box-shadow: var(--dashboard-card-shadow);
  margin-bottom: 1.5rem;
}

.hero-text {
  flex: 1 1 320px;
}

.hero-eyebrow {
  margin: 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--dashboard-text-secondary);
}

.hero-heading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.hero-heading h1 {
  margin: 0.2rem 0;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
}

.hero-subtitle {
  margin: 0.5rem 0 0;
  color: var(--dashboard-text-secondary);
  max-width: 520px;
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.hero-chip ion-icon {
  margin-right: 0.35rem;
}

.panel {
  padding: 1.5rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.panel-eyebrow {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dashboard-text-secondary);
}

.panel-header h3 {
  margin: 0.15rem 0 0;
}

.panel-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.queue-filter-select {
  min-width: 210px;
  max-width: min(280px, 100%);
  --highlight-color-focused: var(--dashboard-success);
}

.panel-updated {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--dashboard-text-secondary);
}

.queue-notes {
  margin-bottom: 1rem;
}

.queue-list-section {
  height: clamp(320px, 52vh, 640px);
  min-height: 320px;
}

.status-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--dashboard-text-secondary);
}

@media (max-width: 640px) {
  ion-content {
    --padding-top: 1.5rem;
  }

  .dashboard-hero,
  .panel {
    padding: 1.25rem;
  }

  .panel-title-row {
    align-items: stretch;
  }

  .queue-filter-select {
    min-width: 0;
    width: 100%;
    max-width: 100%;
  }
}
</style>
