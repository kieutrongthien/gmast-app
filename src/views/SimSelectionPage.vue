<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ t('nav.simSelection') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <section class="sim-page-content">
        <sim-selector />
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import SimSelector from '@/components/SimSelector.vue';

const { t } = useI18n();
</script>

<style scoped>
ion-content {
  --padding-bottom: calc(1rem + var(--app-safe-area-bottom, 0px));
}

.sim-page-content {
  padding: 1rem;
}
</style>
