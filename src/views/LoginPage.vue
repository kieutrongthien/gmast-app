<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <section class="login-screen">
        <div class="login-panel-wrap">
          <img class="login-logo" src="/favicon.png" alt="GMAST logo" />

          <section class="login-content dashboard-panel-card">
            <h2>{{ t('auth.loginHeading') }}</h2>
            <p>{{ t('auth.loginDescription') }}</p>

            <ion-item class="field-item" lines="full">
              <ion-label position="stacked">{{ t('auth.username') }}</ion-label>
              <ion-input
                v-model="username"
                autocomplete="username"
                inputmode="text"
                :placeholder="t('auth.usernamePlaceholder')"
              />
            </ion-item>

            <ion-item class="field-item" lines="full">
              <ion-label position="stacked">{{ t('auth.password') }}</ion-label>
              <ion-input
                v-model="password"
                type="password"
                autocomplete="current-password"
                :placeholder="t('auth.passwordPlaceholder')"
              />
            </ion-item>

            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

            <ion-button expand="block" :disabled="authLoading" @click="handleLogin">
              <ion-spinner v-if="authLoading" name="crescent" slot="start" />
              {{ t('auth.loginButton') }}
            </ion-button>
          </section>
        </div>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSpinner
} from '@ionic/vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { authStore } from '@/stores/authStore';

const { t } = useI18n();
const router = useRouter();
const username = ref('');
const password = ref('');
const localError = ref<string | null>(null);

const authLoading = computed(() => authStore.authLoading.value);
const authError = computed(() => authStore.authError.value);
const errorMessage = computed(() => localError.value ?? authError.value);

const handleLogin = async (): Promise<void> => {
  localError.value = null;

  if (!username.value.trim() || !password.value.trim()) {
    localError.value = t('auth.missingCredentials');
    return;
  }

  try {
    await authStore.login(username.value, password.value);
    await router.replace('/queue');
  } catch (_error) {
    localError.value = t('auth.loginFailed');
  }
};
</script>

<style scoped>
ion-content {
  --padding-bottom: 0;
}

.login-screen {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  padding-bottom: calc(1rem + var(--app-safe-area-bottom, 0px));
}

.login-panel-wrap {
  position: relative;
  width: min(100%, 420px);
}

.login-logo {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -120%);
  width: 88px;
  height: 88px;
  border-radius: 1rem;
  object-fit: cover;
  box-shadow: var(--dashboard-card-shadow);
  z-index: 2;
}

.login-content {
  padding: 1rem;
  padding-top: 3.4rem;
  margin: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.login-content h2 {
  margin: 0;
}

.login-content p {
  margin: 0;
}

.field-item {
  --padding-start: 0;
}

.error-message {
  color: var(--ion-color-danger);
}

@media (max-width: 640px) {
  .login-screen {
    padding: 0.75rem;
  }
}
</style>
