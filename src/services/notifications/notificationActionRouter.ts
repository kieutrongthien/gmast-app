import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications';
import type { Router } from 'vue-router';

let actionListenerRegistered = false;

const DEFAULT_TARGET_ROUTE = '/';

const handleNotificationAction = (router: Router) => (event: ActionPerformed) => {
  const target = (event.notification.extra as Record<string, unknown> | undefined)?.targetRoute;
  if (typeof target === 'string' && target.length > 0) {
    void router.push(target).catch(() => undefined);
    return;
  }

  void router.push(DEFAULT_TARGET_ROUTE).catch(() => undefined);
};

export const initializeNotificationActionRouter = (router: Router): void => {
  if (actionListenerRegistered) {
    return;
  }

  actionListenerRegistered = true;
  void LocalNotifications.addListener('localNotificationActionPerformed', handleNotificationAction(router));
};
