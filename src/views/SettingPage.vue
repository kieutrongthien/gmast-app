<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ t('setting.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <section class="setting-content">
        <div class="dashboard-panel-card">
          <h2>{{ t('setting.heading') }}</h2>
          <p>{{ t('setting.description') }}</p>

          <div class="setting-group">
            <ion-label>
              <h3>{{ t('setting.languageLabel') }}</h3>
            </ion-label>
            <ion-select
              :value="currentLocale"
              class="language-select"
              interface="popover"
              label-placement="stacked"
              @ionChange="handleLocaleChange"
            >
              <ion-select-option value="en">{{ t('setting.languageEnglish') }}</ion-select-option>
              <ion-select-option value="ko">{{ t('setting.languageKorean') }}</ion-select-option>
            </ion-select>
          </div>

          <div class="setting-group">
            <ion-item lines="none" class="toggle-item">
              <ion-label>
                <h3>{{ t('setting.smsWakeWorkerLabel') }}</h3>
                <p>{{ t('setting.smsWakeWorkerHint') }}</p>
              </ion-label>
              <ion-toggle
                slot="end"
                :checked="smsWakeWorkerEnabled"
                @ionChange="handleSmsWakeWorkerToggle"
              />
            </ion-item>
          </div>
          
          <div class="setting-group">
            <ion-button expand="block" color="danger" fill="outline" @click="handleLogout">
              {{ t('setting.logout') }}
            </ion-button>
          </div>
        </div>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import type { SelectChangeEventDetail } from '@ionic/core';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { AppLocale } from '@/i18n/types';
import { setSavedLocale } from '@/services/settings/languageService';
import {
  getSmsWakeWorkerEnabled,
  setSmsWakeWorkerEnabled
} from '@/services/settings/smsWakeWorkerSettingService';
import { authStore } from '@/stores/authStore';

const { t, locale } = useI18n();
const router = useRouter();
const currentLocale = computed(() => locale.value as AppLocale);
const smsWakeWorkerEnabled = ref(true);

const handleLocaleChange = async (event: CustomEvent<SelectChangeEventDetail>) => {
  const value = event.detail.value;
  if (value !== 'en' && value !== 'ko') {
    return;
  }
  locale.value = value;
  await setSavedLocale(value);
};

const handleSmsWakeWorkerToggle = async (event: CustomEvent<{ checked: boolean }>) => {
  const checked = Boolean(event.detail?.checked);

  smsWakeWorkerEnabled.value = checked;
  await setSmsWakeWorkerEnabled(checked);
};

const handleLogout = async (): Promise<void> => {
  await authStore.logout();
  await router.replace('/login');
};

onMounted(async () => {
  smsWakeWorkerEnabled.value = await getSmsWakeWorkerEnabled();
});
</script>

<style scoped>
ion-content {
  --padding-bottom: calc(1rem + var(--app-safe-area-bottom, 0px));
}

.setting-content {
  padding: 1.5rem 1rem;
}

.setting-content .dashboard-panel-card {
  padding: 1rem;
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

.toggle-item {
  --inner-padding-end: 0;
  --padding-start: 0;
  --background: transparent;
  align-items: flex-start;
}

ion-label h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.toggle-item ion-label p {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
}

.setting-group-title {
  margin: 0 0 0.5rem;
  font-weight: 600;
}

.account-meta {
  margin: 0 0 0.75rem;
}

.account-meta p {
  margin: 0.2rem 0;
}

.language-select {
  max-width: 100%;
  --highlight-color-focused: var(--dashboard-success);
}
</style>
