<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Sim Selection</ion-title>
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
import SimSelector from '@/components/SimSelector.vue';
</script>

<style scoped>
.sim-page-content {
  padding: 1rem;
}
</style>
