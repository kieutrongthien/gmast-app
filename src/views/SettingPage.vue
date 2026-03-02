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

        <div class="setting-group">
          <p class="setting-group-title">{{ t('setting.accountSection') }}</p>
          <div class="account-meta">
            <p><strong>{{ t('setting.currentUser') }}:</strong> {{ displayName }}</p>
            <p><strong>{{ t('setting.username') }}:</strong> {{ displayUsername }}</p>
            <p><strong>{{ t('setting.email') }}:</strong> {{ displayEmail }}</p>
            <p><strong>{{ t('setting.role') }}:</strong> {{ displayRole }}</p>
          </div>
          <ion-button color="medium" fill="outline" @click="handleLogout">
            {{ t('setting.logout') }}
          </ion-button>
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
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import type { SelectChangeEventDetail } from '@ionic/core';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { AppLocale } from '@/i18n/types';
import { setSavedLocale } from '@/services/settings/languageService';
import { authStore } from '@/stores/authStore';

const { t, locale } = useI18n();
const router = useRouter();
const currentLocale = computed(() => locale.value as AppLocale);

const pickString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const profile = computed(() => authStore.userProfile.value ?? {});
const fallbackText = computed(() => t('setting.unknownUser'));

const displayName = computed(() => {
  return (
    pickString(profile.value.name)
    ?? pickString(profile.value.full_name)
    ?? pickString(profile.value.display_name)
    ?? pickString(profile.value.user_name)
    ?? pickString(profile.value.username)
    ?? fallbackText.value
  );
});

const displayUsername = computed(() => {
  return (
    pickString(profile.value.username)
    ?? pickString(profile.value.user_name)
    ?? authStore.username.value
    ?? fallbackText.value
  );
});

const displayEmail = computed(() => {
  return (
    pickString(profile.value.email)
    ?? pickString(profile.value.mail)
    ?? pickString(profile.value.user_email)
    ?? fallbackText.value
  );
});

const displayRole = computed(() => {
  return (
    pickString(profile.value.role)
    ?? pickString(profile.value.role_name)
    ?? pickString(profile.value.user_role)
    ?? fallbackText.value
  );
});

const handleLocaleChange = async (event: CustomEvent<SelectChangeEventDetail>) => {
  const value = event.detail.value;
  if (value !== 'en' && value !== 'ko') {
    return;
  }
  locale.value = value;
  await setSavedLocale(value);
};

const handleLogout = async (): Promise<void> => {
  await authStore.logout();
  await router.replace('/login');
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

.account-meta {
  margin: 0 0 0.75rem;
}

.account-meta p {
  margin: 0.2rem 0;
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
