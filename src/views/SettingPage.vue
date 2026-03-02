<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Setting</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <section class="setting-content">
        <h2>Cài đặt</h2>
        <p>Trang cài đặt đang được cập nhật.</p>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
</script>

<style scoped>
.setting-content {
  padding: 1rem;
}

.setting-content h2 {
  margin: 0 0 0.5rem;
}

.setting-content p {
  margin: 0;
  color: var(--ion-color-step-600);
}
</style>
