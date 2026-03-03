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

      <section class="home-shell">
        <section class="home-hero dashboard-panel-card">
          <div class="hero-copy">
            <p class="hero-eyebrow">{{ t('home.heroEyebrow') }}</p>
            <h2>{{ t('home.heroTitle') }}</h2>
            <p class="hero-subtitle">{{ t('home.heroSubtitle') }}</p>
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

        <section class="kpi-grid">
          <article class="kpi-card dashboard-panel-card">
            <p>{{ t('home.kpi.pending.label') }}</p>
            <strong>{{ pendingCount }}</strong>
          </article>
          <article class="kpi-card dashboard-panel-card">
            <p>{{ t('home.kpi.processing.label') }}</p>
            <strong>{{ processingCount }}</strong>
          </article>
          <article class="kpi-card dashboard-panel-card">
            <p>{{ t('home.kpi.failed.label') }}</p>
            <strong>{{ failedCount }}</strong>
          </article>
          <article class="kpi-card dashboard-panel-card">
            <p>{{ t('home.totalItems') }}</p>
            <strong>{{ totalItems }}</strong>
          </article>
        </section>

        <section class="queue-card dashboard-panel-card">
          <div class="queue-toolbar">
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

            <div class="queue-meta">
              <ion-note>{{ t('home.updated', { value: lastUpdatedLabel }) }}</ion-note>
              <ion-note>{{ t('home.pageInfo', { page: meta?.page ?? 1, total: meta?.totalPages ?? 1 }) }}</ion-note>
            </div>
          </div>

          <div class="queue-notes" v-if="hasResultFailures">
            <ion-chip color="danger" button @click="handleRetryResultSync">
              <ion-icon :icon="cloudOfflineOutline" />
              <ion-label>{{ t('home.syncErrorChip', { count: failedResultCount }) }}</ion-label>
            </ion-chip>
          </div>

          <ion-list lines="full" class="queue-list">
            <ion-item v-for="message in filteredMessages" :key="message.id" lines="full">
              <ion-label class="queue-item-label">
                <div class="queue-item-head">
                  <strong>{{ message.receiver }}</strong>
                  <ion-chip :color="statusColor(message.status)" size="small">{{ t(`queue.status.${message.status}`) }}</ion-chip>
                </div>
                <p>{{ message.message }}</p>
                <ion-note>{{ message.updatedAt }}</ion-note>
              </ion-label>
            </ion-item>
          </ion-list>

          <div class="status-loading" v-if="loading || loadingMore">
            <ion-spinner name="crescent" />
            <span>{{ t('home.syncing') }}</span>
          </div>
        </section>
      </section>

      <ion-infinite-scroll
        threshold="120px"
        :disabled="!hasMore || loading || loadingMore"
        @ionInfinite="handleInfinite"
      >
        <ion-infinite-scroll-content
          loading-spinner="crescent"
          :loading-text="t('home.loadingMore')"
        />
      </ion-infinite-scroll>

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
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
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
import type {
  InfiniteScrollCustomEvent,
  RefresherCustomEvent,
  SelectChangeEventDetail
} from '@ionic/core';
import { cloudOfflineOutline, refreshOutline, warningOutline } from 'ionicons/icons';
import { onMounted, computed, ref, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePendingQueue } from '@/composables/usePendingQueue';
import { useResultSync } from '@/composables/useResultSync';
import type { QueueMessage, QueueMessageStatus } from '@/types/queue';

const { t } = useI18n();

const {
  messages,
  meta,
  loading,
  loadingMore,
  hasMore,
  error,
  lastUpdated,
  usingMock,
  loadQueue,
  refreshQueue,
  loadNextPage,
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
  {
    id: 'failed',
    labelKey: 'home.statuses.failed',
    filter: (message) => message.status === 'failed'
  }
];

const totalItems = computed(() => messages.value.length);
const pendingCount = computed(() => messages.value.filter((item: QueueMessage) => item.status === 'pending').length);
const processingCount = computed(() => messages.value.filter((item: QueueMessage) => item.status === 'processing').length);
const failedCount = computed(() => messages.value.filter((item: QueueMessage) => item.status === 'failed').length);

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

const statusColor = (status: QueueMessageStatus): string => {
  switch (status) {
    case 'pending':
      return 'primary';
    case 'processing':
      return 'warning';
    case 'failed':
      return 'danger';
    case 'sent':
      return 'success';
    default:
      return 'medium';
  }
};

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

const handleInfinite = async (event: InfiniteScrollCustomEvent) => {
  await loadNextPage();
  event.target.complete();
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
  --padding-top: 1rem;
  --padding-bottom: calc(1.5rem + var(--app-safe-area-bottom, 0px));
  --padding-start: clamp(0.9rem, 3vw, 2rem);
  --padding-end: clamp(0.9rem, 3vw, 2rem);
}

.home-shell {
  display: grid;
  gap: 1rem;
}

.home-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: .75rem;
}

.hero-copy h2 {
  margin: 0.3rem 0;
}

.hero-eyebrow {
  margin: 0;
  color: var(--dashboard-text-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.hero-subtitle {
  margin: 0;
  color: var(--dashboard-text-secondary);
  max-width: 560px;
}

.hero-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}

.kpi-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.kpi-card {
    padding: .75rem;
}

.kpi-card p {
  margin: 0;
  color: var(--dashboard-text-secondary);
  font-size: 0.85rem;
}

.kpi-card strong {
  display: block;
  margin-top: 0.3rem;
  font-size: 1.4rem;
}

.queue-toolbar {
  --border-color: var(--ion-item-border-color, var(--ion-border-color, var(--ion-color-step-150, var(--ion-background-color-step-150, rgba(0, 0, 0, 0.13)))));  
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0;
  padding: .75rem;
  border-bottom: 1px solid var(--border-color);
}

.queue-filter-select {
  min-width: 220px;
}

.queue-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  color: var(--dashboard-text-secondary);
}

.queue-notes {
  margin-bottom: 0.75rem;
}

.queue-list {
  border-radius: 0.8rem;
  overflow: hidden;
  padding-top: 0;
}

.queue-item-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.queue-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.queue-item-label p {
  margin: 0;
  color: var(--dashboard-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.status-loading {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--dashboard-text-secondary);
  padding: .75rem;
}

@media (max-width: 680px) {
  .queue-meta {
    align-items: flex-start;
  }

  .queue-filter-select {
    width: 100%;
  }
}
</style>
