<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ t('setting.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <section class="setting-content dashboard-panel-card">
        <h2>{{ t('setting.heading') }}</h2>
        <p>{{ t('setting.description') }}</p>

        <div class="setting-group">
          <p class="setting-group-title">{{ t('setting.languageSection') }}</p>
          <ion-select
            :value="currentLocale"
            class="language-select"
            interface="popover"
            :label="t('setting.languageLabel')"
            label-placement="stacked"
            @ionChange="handleLocaleChange"
          >
            <ion-select-option value="en">{{ t('setting.languageEnglish') }}</ion-select-option>
            <ion-select-option value="ko">{{ t('setting.languageKorean') }}</ion-select-option>
          </ion-select>
        </div>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonContent, IonHeader, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/vue';
import type { SelectChangeEventDetail } from '@ionic/core';
import { useI18n } from 'vue-i18n';
import type { AppLocale } from '@/i18n/types';
import { setSavedLocale } from '@/services/settings/languageService';

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value as AppLocale);

const handleLocaleChange = async (event: CustomEvent<SelectChangeEventDetail>) => {
  const value = event.detail.value;
  if (value !== 'en' && value !== 'ko') {
    return;
  }
  locale.value = value;
  await setSavedLocale(value);
};
</script>

<style scoped>
ion-content {
  --padding-bottom: calc(1rem + var(--app-safe-area-bottom, 0px));
}

.setting-content {
  padding: 1rem;
  margin: 1rem;
}

.setting-content h2 {
  margin: 0 0 0.5rem;
}

.setting-content p {
  margin: 0 0 1rem;
  color: var(--dashboard-text-secondary);
}

.setting-group {
  margin-top: 0.5rem;
}

.setting-group-title {
  margin: 0 0 0.5rem;
  font-weight: 600;
}

.language-select {
  max-width: 280px;
  --highlight-color-focused: var(--dashboard-success);
}

@media (max-width: 640px) {
  .setting-content {
    margin: 0.75rem;
  }

  .language-select {
    max-width: 100%;
  }
}
</style>
