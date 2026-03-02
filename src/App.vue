<template>
  <ion-app>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="queue" href="/queue">
          <ion-icon :icon="listOutline" />
          <ion-label>Queue</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="sim-selection" href="/sim-selection">
          <ion-icon :icon="phonePortraitOutline" />
          <ion-label>Sim</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="setting" href="/setting">
          <ion-icon :icon="settingsOutline" />
          <ion-label>Setting</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
    <version-gate-modal />
  </ion-app>
</template>

<script setup lang="ts">
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs
} from '@ionic/vue';
import { listOutline, phonePortraitOutline, settingsOutline } from 'ionicons/icons';
import VersionGateModal from '@/components/VersionGateModal.vue';
</script>
