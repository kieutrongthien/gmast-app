<template>
  <section class="kpi-grid">
    <article class="kpi-card dashboard-panel-card">
      <p>{{ t('home.kpi.pending.label') }}</p>
      <strong>{{ stats.pending }}</strong>
    </article>
    <article class="kpi-card dashboard-panel-card">
      <p>{{ t('home.kpi.processing.label') }}</p>
      <strong>{{ stats.processing }}</strong>
    </article>
    <article class="kpi-card dashboard-panel-card">
      <p>{{ t('home.kpi.sent.label') }}</p>
      <strong>{{ stats.sent }}</strong>
    </article>
    <article class="kpi-card dashboard-panel-card">
      <p>{{ t('home.kpi.failed.label') }}</p>
      <strong>{{ stats.failed }}</strong>
    </article>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface KpiStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

defineProps<{
  stats: KpiStats;
}>();

const { t } = useI18n();
</script>

<style scoped>
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
</style>
