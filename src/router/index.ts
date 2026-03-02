import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import HomePage from '@/views/HomePage.vue';
import SimSelectionPage from '@/views/SimSelectionPage.vue';
import SettingPage from '@/views/SettingPage.vue';
import LoginPage from '@/views/LoginPage.vue';
import { ensureVersionGateSnapshot } from '@/services/version/versionGateController';
import { authStore } from '@/stores/authStore';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/queue'
  },
  {
    path: '/home',
    redirect: '/queue'
  },
  {
    path: '/queue',
    name: 'Queue',
    component: HomePage,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/sim-selection',
    name: 'SimSelection',
    component: SimSelectionPage,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/setting',
    name: 'Setting',
    component: SettingPage,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to, _from, next) => {
  try {
    await ensureVersionGateSnapshot();
  } catch (error) {
    console.warn('[version-guard] Unable to verify app version', error);
  }

  await authStore.hydrate();

  if (to.meta.requiresAuth && !authStore.isAuthenticated.value) {
    next('/login');
    return;
  }

  if (to.path === '/login' && authStore.isAuthenticated.value) {
    next('/queue');
    return;
  }

  next();
});

export default router;
