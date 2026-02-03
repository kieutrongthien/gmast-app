<template>
  <ion-app>
    <ion-router-outlet />
    <version-gate-modal />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import VersionGateModal from '@/components/VersionGateModal.vue';
</script>
