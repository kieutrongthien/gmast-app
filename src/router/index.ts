import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import HomePage from '@/views/HomePage.vue';
import SimSelectionPage from '@/views/SimSelectionPage.vue';
import SettingPage from '@/views/SettingPage.vue';
import { ensureVersionGateSnapshot } from '@/services/version/versionGateController';

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
    component: HomePage
  },
  {
    path: '/sim-selection',
    name: 'SimSelection',
    component: SimSelectionPage
  },
  {
    path: '/setting',
    name: 'Setting',
    component: SettingPage
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (_to, _from, next) => {
  try {
    await ensureVersionGateSnapshot();
  } catch (error) {
    console.warn('[version-guard] Không thể kiểm tra phiên bản', error);
  }
  next();
});

export default router;
