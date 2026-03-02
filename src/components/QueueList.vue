<template>
  <div class="queue-list" ref="containerRef" @scroll="handleScroll">
    <template v-if="hasItems">
      <div
        class="queue-virtual-track"
        :style="{ height: `${totalHeight}px` }"
      >
        <div class="queue-virtual-window" :style="{ transform: `translateY(${topPadding}px)` }">
          <ion-list lines="full">
            <ion-item
              v-for="message in visibleItems"
              :key="message.id"
              lines="full"
            >
              <ion-label class="queue-label">
                <div class="queue-label__row">
                  <span class="queue-label__to">{{ message.receiver }}</span>
                  <ion-badge :color="statusColor(message.status)">
                    {{ formatStatus(message.status) }}
                  </ion-badge>
                </div>
                <p class="queue-label__body">
                  {{ message.message }}
                </p>
                <div class="queue-label__meta">
                  <ion-note>
                    {{ message.title || t('queue.fallbackTitle') }} · {{ message.priority.toUpperCase() }}
                  </ion-note>
                  <span class="queue-label__time">{{ formatTimestamp(message.updatedAt) }}</span>
                </div>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>
    </template>

    <ion-list v-else class="queue-list__empty">
      <ion-item lines="none">
        <ion-label>
          <h3>{{ t('queue.emptyTitle') }}</h3>
          <p>{{ t('queue.emptySubtitle') }}</p>
        </ion-label>
      </ion-item>
    </ion-list>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, toRefs } from 'vue';
import { IonBadge, IonItem, IonLabel, IonList, IonNote } from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import type { QueueMessage, QueueMessageStatus } from '@/types/queue';

const { t, locale } = useI18n();

const props = defineProps({
  items: {
    type: Array as () => QueueMessage[],
    required: true
  },
  rowHeight: {
    type: Number,
    default: 92
  },
  overscan: {
    type: Number,
    default: 6
  }
});

const { items } = toRefs(props);
const containerRef = ref<HTMLElement | null>(null);
const viewportHeight = ref(600);
const internalScrollTop = ref(0);
let resizeObserver: ResizeObserver | null = null;

const totalHeight = computed(() => items.value.length * props.rowHeight);

const startIndex = computed(() => {
  const index = Math.floor(internalScrollTop.value / props.rowHeight) - props.overscan;
  return Math.max(0, index);
});

const visibleCount = computed(() => {
  const base = Math.ceil(viewportHeight.value / props.rowHeight) + props.overscan * 2;
  return Math.max(base, props.overscan * 2);
});

const endIndex = computed(() => Math.min(items.value.length, startIndex.value + visibleCount.value));

const visibleItems = computed(() => items.value.slice(startIndex.value, endIndex.value));

const topPadding = computed(() => startIndex.value * props.rowHeight);

const hasItems = computed(() => items.value.length > 0);

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement | null;
  internalScrollTop.value = target?.scrollTop ?? 0;
};

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

const formatStatus = (status: QueueMessageStatus): string => {
  switch (status) {
    case 'pending':
      return t('queue.status.pending');
    case 'processing':
      return t('queue.status.processing');
    case 'failed':
      return t('queue.status.failed');
    case 'sent':
      return t('queue.status.sent');
    default:
      return t('queue.status.unknown');
  }
};

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale.value === 'ko' ? 'ko-KR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  }).format(date);
};

const connectResizeObserver = () => {
  if (typeof window === 'undefined' || !('ResizeObserver' in window)) {
    return;
  }
  resizeObserver = new ResizeObserver((entries) => {
    const [entry] = entries;
    if (entry) {
      viewportHeight.value = entry.contentRect.height;
    }
  });
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
    viewportHeight.value = containerRef.value.getBoundingClientRect().height || viewportHeight.value;
  }
};

const disconnectResizeObserver = () => {
  resizeObserver?.disconnect();
  resizeObserver = null;
};

onMounted(connectResizeObserver);
onBeforeUnmount(disconnectResizeObserver);

watch(
  containerRef,
  (node, prev) => {
    if (resizeObserver && prev) {
      resizeObserver.unobserve(prev);
    }
    if (node && resizeObserver) {
      resizeObserver.observe(node);
      viewportHeight.value = node.getBoundingClientRect().height || viewportHeight.value;
    }
  },
  { flush: 'post' }
);
</script>

<style scoped>
.queue-list {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.queue-virtual-track {
  width: 100%;
  position: relative;
}

.queue-virtual-window {
  position: absolute;
  left: 0;
  right: 0;
  will-change: transform;
}

.queue-label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.queue-label__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.queue-label__to {
  font-weight: 600;
}

.queue-label__body {
  margin: 0;
  color: var(--ion-color-step-600);
  font-size: 0.95rem;
  line-height: 1.2rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.queue-label__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.queue-label__time {
  color: var(--ion-color-step-500);
}

.queue-list__empty {
  margin-top: 1.5rem;
}
</style>
