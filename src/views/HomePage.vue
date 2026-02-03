<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Pending Queue</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" :disabled="loading" @click="handleManualRefresh">
            <ion-icon :icon="refreshOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="handleScroll">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content
          pulling-text="Kéo để làm mới"
          refreshing-spinner="crescent"
          refreshing-text="Đang tải..."
        />
      </ion-refresher>

      <section class="queue-status-card">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Trạng thái</ion-card-title>
            <ion-card-subtitle>
              {{ totalItems }} tin chờ · {{ totalPages }} trang
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="status-row">
              <div>
                <p class="status-label">Cập nhật</p>
                <p class="status-value">{{ lastUpdatedLabel }}</p>
              </div>
              <div class="status-flags">
                <ion-chip color="warning" v-if="usingMock">
                  <ion-icon :icon="alertCircleOutline" />
                  <ion-label>Mock data</ion-label>
                </ion-chip>
                <ion-chip color="danger" v-if="error">
                  <ion-icon :icon="warningOutline" />
                  <ion-label>Lỗi API</ion-label>
                </ion-chip>
                <ion-chip
                  color="danger"
                  button
                  v-if="hasResultFailures"
                  @click="handleRetryResultSync"
                >
                  <ion-icon :icon="cloudOfflineOutline" />
                  <ion-label>Lỗi sync ({{ failedResultCount }})</ion-label>
                </ion-chip>
              </div>
            </div>
            <div v-if="loading" class="status-loading">
              <ion-spinner name="crescent" />
              <span>Đang đồng bộ...</span>
            </div>
          </ion-card-content>
        </ion-card>
      </section>

      <queue-list
        :items="messages"
        :scroll-top="scrollTop"
        class="queue-list-section"
      />

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
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar
} from '@ionic/vue';
import type { RefresherCustomEvent } from '@ionic/core';
import { alertCircleOutline, cloudOfflineOutline, refreshOutline, warningOutline } from 'ionicons/icons';
import { onMounted, computed, ref } from 'vue';
import QueueList from '@/components/QueueList.vue';
import { usePendingQueue } from '@/composables/usePendingQueue';
import { useResultSync } from '@/composables/useResultSync';

const {
  messages,
  meta,
  loading,
  error,
  lastUpdated,
  usingMock,
  loadQueue,
  refreshQueue
} = usePendingQueue();

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
    return lastErrorMessage.value;
  }
  return `${failureCount.value} kết quả chưa đồng bộ. Thử lại nhé?`;
});

const scrollTop = ref(0);

const totalItems = computed(() => meta.value?.totalItems ?? messages.value.length);
const totalPages = computed(() => meta.value?.totalPages ?? 1);

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) {
    return 'Chưa có dữ liệu';
  }
  const updatedDate = new Date(lastUpdated.value);
  if (Number.isNaN(updatedDate.getTime())) {
    return lastUpdated.value;
  }
  const diffMs = Date.now() - updatedDate.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) {
    return 'Vừa xong';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours} giờ trước`;
});

const handleScroll = (event: CustomEvent) => {
  const detail = event.detail as { scrollTop?: number };
  scrollTop.value = detail?.scrollTop ?? 0;
};

const handleRefresh = async (event: RefresherCustomEvent) => {
  await refreshQueue();
  event.target.complete();
};

const handleManualRefresh = async () => {
  await refreshQueue();
};

const handleRetryResultSync = async () => {
  await retryFailedResults();
};

const handleToastDismiss = () => {
  dismissToast();
};

const resultToastButtons = [
  {
    text: 'Thử lại',
    handler: () => {
      handleRetryResultSync();
      return false;
    }
  },
  {
    text: 'Đóng',
    role: 'cancel',
    handler: () => {
      dismissToast();
    }
  }
];

onMounted(() => {
  loadQueue();
  hydrateFailures();
});
</script>

<style scoped>
ion-content {
  --padding-top: 1rem;
  --padding-bottom: 1rem;
  --padding-start: 1rem;
  --padding-end: 1rem;
}

.queue-status-card {
  margin-bottom: 1rem;
}

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.status-label {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ion-color-step-500);
}

.status-value {
  margin: 0.1rem 0 0;
  font-weight: 600;
}

.status-flags {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.status-loading {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
  font-size: 0.9rem;
}

.queue-list-section {
  min-height: 40vh;
}
</style>
