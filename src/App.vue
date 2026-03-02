<template>
  <ion-app>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
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
      :message="t('startupPermission.message')"
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
import { listOutline, phonePortraitOutline, settingsOutline } from 'ionicons/icons';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import VersionGateModal from '@/components/VersionGateModal.vue';
import { ensureStartupPermissions } from '@/services/permissions/startupPermissionService';

const { t } = useI18n();
const permissionAlertOpen = ref(false);

const permissionAlertButtons = computed(() => [
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

onMounted(async () => {
  const granted = await ensureStartupPermissions();
  if (!granted) {
    permissionAlertOpen.value = true;
  }
});
</script>
