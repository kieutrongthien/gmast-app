<template>
  <ion-app>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar v-if="showTabBar" slot="bottom">
        <ion-tab-button tab="queue" href="/queue">
          <ion-icon :icon="listOutline" />
          <ion-label>{{ t('nav.queue') }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="sim-selection" href="/sim-selection">
          <ion-icon :icon="phonePortraitOutline" />
          <ion-label>{{ t('nav.simSelection') }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="setting" href="/setting">
          <ion-icon :icon="settingsOutline" />
          <ion-label>{{ t('nav.setting') }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
    <ion-alert
      :is-open="permissionAlertOpen"
      :header="t('startupPermission.title')"
      :message="permissionAlertMessage"
      :buttons="permissionAlertButtons"
      :backdrop-dismiss="false"
    />
    <version-gate-modal />
  </ion-app>
</template>

<script setup lang="ts">
import {
  IonApp,
  IonAlert,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs
} from '@ionic/vue';
import { App as AppPlugin } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { listOutline, phonePortraitOutline, settingsOutline } from 'ionicons/icons';
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import VersionGateModal from '@/components/VersionGateModal.vue';
import { appConfig } from '@/config/appConfig';
import { saveMobileFcmToken } from '@/services/mobile/mobileApiService';
import {
  initializeFcmWakeService,
  subscribeFcmTokenChange
} from '@/services/notifications/fcmWakeService';
import {
  ensureStartupPermissions,
  getStartupPermissionDebugSnapshot
} from '@/services/permissions/startupPermissionService';
import { openSmsPermissionSettings } from '@/services/permissions/smsSendPermissionService';
import { authStore } from '@/stores/authStore';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const permissionAlertOpen = ref(false);
const startupPermissionDebugSummary = ref('SIM: not-checked · SMS: not-checked · Notification: not-checked');
const startupPermissionsGranted = ref(false);
const postPermissionReady = ref(false);
const lastSyncedFcmToken = ref<string | null>(null);
let unsubscribeFcmTokenChange: (() => void) | null = null;

const showTabBar = computed(() => authStore.isAuthenticated.value && route.meta.requiresAuth === true);

const permissionAlertMessage = computed(() => {
  return `${t('startupPermission.message')}<br/><br/>${t('startupPermission.guide')}<br/><br/>Debug: ${startupPermissionDebugSummary.value}`;
});

const permissionAlertButtons = computed(() => [
  {
    text: t('startupPermission.openSettings'),
    handler: () => {
      void openAppSettings();
      return false;
    }
  },
  {
    text: t('startupPermission.checkAgain'),
    handler: () => {
      void recheckStartupPermissions();
      return false;
    }
  },
  {
    text: t('startupPermission.exit'),
    role: 'confirm',
    handler: () => {
      if (Capacitor.isNativePlatform()) {
        AppPlugin.exitApp();
      }
    }
  }
]);

const syncFcmTokenToBackend = async (token: string | null): Promise<void> => {
  if (!token || token === lastSyncedFcmToken.value || !authStore.isAuthenticated.value) {
    return;
  }

  const sessionToken = authStore.state.session?.token;
  if (!sessionToken) {
    return;
  }

  try {
    await saveMobileFcmToken(
      {
        token,
        platform: Capacitor.getPlatform()
      },
      sessionToken
    );

    lastSyncedFcmToken.value = token;
  } catch (error) {
    console.warn('[App] failed to sync refreshed FCM token', error);
  }
};

const persistApiBaseUrlForNativeWakeWorker = async (): Promise<void> => {
  const baseUrl = appConfig.apiBaseUrl?.trim();
  if (!baseUrl) {
    return;
  }

  try {
    await Preferences.set({
      key: 'gmast::api-base-url',
      value: baseUrl
    });
  } catch (error) {
    console.warn('[App] failed to persist api base url for wake worker', error);
  }
};

const verifyStartupPermissions = async (): Promise<boolean> => {
  const granted = await ensureStartupPermissions();
  startupPermissionsGranted.value = granted;

  const debug = getStartupPermissionDebugSnapshot();
  startupPermissionDebugSummary.value = debug.summary;

  permissionAlertOpen.value = !granted;
  return granted;
};

const openAppSettings = async (): Promise<void> => {
  await openSmsPermissionSettings();
};

const ensurePostPermissionReady = async (): Promise<void> => {
  if (postPermissionReady.value) {
    return;
  }

  if (!authStore.isAuthenticated.value && route.meta.requiresAuth === true) {
    await router.replace('/login');
  }

  await initializeFcmWakeService();

  if (!unsubscribeFcmTokenChange) {
    unsubscribeFcmTokenChange = subscribeFcmTokenChange((token) => {
      void syncFcmTokenToBackend(token);
    });
  }

  postPermissionReady.value = true;
};

const recheckStartupPermissions = async (): Promise<void> => {
  const granted = await verifyStartupPermissions();
  if (!granted) {
    return;
  }

  await ensurePostPermissionReady();
};

onMounted(async () => {
  await persistApiBaseUrlForNativeWakeWorker();

  const granted = await verifyStartupPermissions();
  if (!granted) {
    return;
  }

  await ensurePostPermissionReady();
});

onBeforeUnmount(() => {
  unsubscribeFcmTokenChange?.();
  unsubscribeFcmTokenChange = null;
});

watch(
  () => authStore.isAuthenticated.value,
  (isAuthenticated) => {
    if (isAuthenticated) {
      return;
    }

    lastSyncedFcmToken.value = null;
  },
  { immediate: true }
);

watchEffect(() => {
  if (!authStore.isAuthenticated.value && route.meta.requiresAuth === true) {
    void router.replace('/login');
  }
});
</script>
