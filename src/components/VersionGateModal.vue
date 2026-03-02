<template>
  <ion-modal :is-open="isBlocked" :backdrop-dismiss="false" class="version-gate-modal">
    <ion-header translucent>
      <ion-toolbar color="danger">
        <ion-title>{{ t('versionGate.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="modal-body">
        <p class="modal-lede">
          {{ t('versionGate.description') }}
        </p>

        <div v-if="snapshot" class="snapshot-details">
          <p>
            <strong>{{ t('versionGate.currentBuild') }}:</strong>
            <span>{{ snapshot.currentBuild ?? snapshot.currentVersion ?? t('versionGate.unknown') }}</span>
          </p>
          <p>
            <strong>{{ t('versionGate.minimumRequired') }}:</strong>
            <span>{{ snapshot.requiredBuild ?? snapshot.requiredVersion ?? t('versionGate.unknown') }}</span>
          </p>
          <p v-if="snapshot.message">
            <strong>{{ t('versionGate.message') }}:</strong>
            <span>{{ snapshot.message }}</span>
          </p>
        </div>

        <ion-text color="danger" v-if="errorMessage">
          {{ errorMessage }}
        </ion-text>

        <div class="actions">
          <ion-button
            expand="block"
            color="primary"
            v-if="snapshot?.downloadUrl"
            @click="handleDownload"
          >
            {{ t('versionGate.download') }}
          </ion-button>

          <ion-button
            expand="block"
            color="medium"
            fill="outline"
            :disabled="loading"
            @click="handleRetry"
          >
            <ion-spinner name="crescent" slot="start" v-if="loading" />
            {{ t('versionGate.retry') }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { Capacitor } from '@capacitor/core';
import { useI18n } from 'vue-i18n';
import { useVersionGate } from '@/composables/useVersionGate';

const { snapshot, isBlocked, loading, errorMessage, retry } = useVersionGate();
const { t } = useI18n();

const handleRetry = async (): Promise<void> => {
  await retry();
};

const handleDownload = (): void => {
  const url = snapshot.value?.downloadUrl;
  if (!url) {
    return;
  }

  const platform = Capacitor.getPlatform?.() ?? 'web';
  const target = platform === 'web' ? '_blank' : '_system';
  window.open(url, target, target === '_blank' ? 'noopener' : undefined);
};
</script>

<style scoped>
.version-gate-modal {
  --width: min(480px, 90vw);
  --height: auto;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-lede {
  margin: 0;
  font-size: 1rem;
}

.snapshot-details {
  border: 1px solid var(--ion-color-danger);
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: rgba(220, 53, 69, 0.05);
  font-size: 0.95rem;
}

.snapshot-details p {
  margin: 0.3rem 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
