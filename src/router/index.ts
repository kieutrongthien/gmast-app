import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import HomePage from '@/views/HomePage.vue';
import { ensureVersionGateSnapshot } from '@/services/version/versionGateController';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage
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
