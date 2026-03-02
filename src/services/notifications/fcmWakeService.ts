import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type PushNotificationSchema,
  type ActionPerformed,
  type Token,
  type RegistrationError
} from '@capacitor/push-notifications';

type WakePayload = Record<string, unknown>;
type TokenChangeListener = (token: string | null) => void;

let initialized = false;
let latestFcmToken: string | null = null;
const tokenAwaiters = new Set<(token: string | null) => void>();
const tokenChangeListeners = new Set<TokenChangeListener>();

const isNative = (): boolean => Capacitor.isNativePlatform();
const isDebugMode = (): boolean => import.meta.env.DEV || isNative();

const debugFcmPayload = (source: 'received' | 'action', raw: unknown, payload: WakePayload): void => {
  if (!isDebugMode()) {
    return;
  }

  console.info('[FCM][DEBUG] notification payload', {
    source,
    payload,
    raw
  });
};

const traceFcm = (message: string, extra?: Record<string, unknown>): void => {
  if (!isDebugMode()) {
    return;
  }

  console.warn('[FCM][TRACE]', message, extra ?? {});
};

const normalizePayload = (notification: PushNotificationSchema): WakePayload => {
  const sourceData = notification.data ?? {};
  if (sourceData && typeof sourceData === 'object' && !Array.isArray(sourceData)) {
    return sourceData as WakePayload;
  }
  return {};
};

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
};

const shouldWakeSmsPipeline = (payload: WakePayload): boolean => {
  const event = String(payload.event ?? payload.type ?? '').trim().toLowerCase();
  if (event === 'sms_queue_wake' || event === 'sms-wake' || event === 'sms_send_wake') {
    return true;
  }

  return parseBoolean(payload.wakeSmsQueue ?? payload.wakeSendPipeline ?? payload.wake);
};

const publishFcmToken = (token: string | null) => {
  latestFcmToken = token;

  tokenChangeListeners.forEach((listener) => {
    try {
      listener(token);
    } catch (error) {
      console.warn('[FCM] token change listener failed', error);
    }
  });

  tokenAwaiters.forEach((listener) => {
    try {
      listener(token);
    } catch (error) {
      console.warn('[FCM] token listener failed', error);
    }
  });
};

const onRegistration = (token: Token) => {
  publishFcmToken(token.value ?? null);
  traceFcm('registration callback fired', {
    hasToken: Boolean(token.value),
    tokenLength: token.value?.length ?? 0
  });
  console.info('[FCM] device token registered', token.value);
};

const onRegistrationError = (error: RegistrationError) => {
  traceFcm('registration callback error', {
    error
  });
  console.warn('[FCM] registration failed', error);
};

const onNotificationReceived = async (notification: PushNotificationSchema): Promise<void> => {
  const payload = normalizePayload(notification);
  debugFcmPayload('received', notification, payload);
  const shouldWake = shouldWakeSmsPipeline(payload);

  if (isDebugMode()) {
    console.info('[FCM][DEBUG] wake decision', {
      source: 'received',
      shouldWake,
      event: payload.event ?? payload.type,
      wakeSmsQueue: payload.wakeSmsQueue,
      wakeSendPipeline: payload.wakeSendPipeline,
      wake: payload.wake
    });
  }

  if (!shouldWake) {
    return;
  }

  traceFcm('wake payload received; handled by native worker', {
    source: 'received'
  });
};

const onNotificationActionPerformed = async (action: ActionPerformed): Promise<void> => {
  const payload = normalizePayload(action.notification);
  debugFcmPayload('action', action, payload);
  const shouldWake = shouldWakeSmsPipeline(payload);

  if (isDebugMode()) {
    console.info('[FCM][DEBUG] wake decision', {
      source: 'action',
      shouldWake,
      event: payload.event ?? payload.type,
      wakeSmsQueue: payload.wakeSmsQueue,
      wakeSendPipeline: payload.wakeSendPipeline,
      wake: payload.wake
    });
  }

  if (!shouldWake) {
    return;
  }

  traceFcm('wake action payload received; handled by native worker', {
    source: 'action'
  });
};

export const initializeFcmWakeService = async (): Promise<void> => {
  traceFcm('initialize called', {
    native: isNative(),
    initialized
  });

  if (!isNative() || initialized) {
    traceFcm('initialize skipped', {
      native: isNative(),
      initialized
    });
    return;
  }

  initialized = true;

  const permissions = await PushNotifications.checkPermissions();
  traceFcm('permission checked', {
    receive: permissions.receive
  });

  if (permissions.receive !== 'granted') {
    const requested = await PushNotifications.requestPermissions();
    traceFcm('permission requested', {
      receive: requested.receive
    });

    if (requested.receive !== 'granted') {
      console.warn('[FCM] push permission denied');
      return;
    }
  }

  traceFcm('registering push notifications');
  await PushNotifications.register();

  await PushNotifications.addListener('registration', onRegistration);
  await PushNotifications.addListener('registrationError', onRegistrationError);
  await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
    await onNotificationReceived(notification);
  });
  await PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
    await onNotificationActionPerformed(action);
  });

  traceFcm('listeners attached');
};

export const getLatestFcmToken = (): string | null => latestFcmToken;

export const subscribeFcmTokenChange = (listener: TokenChangeListener): (() => void) => {
  tokenChangeListeners.add(listener);
  return () => {
    tokenChangeListeners.delete(listener);
  };
};

export const waitForFcmToken = async (timeoutMs = 5000): Promise<string | null> => {
  if (latestFcmToken) {
    return latestFcmToken;
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const listener = (token: string | null) => {
      if (settled) {
        return;
      }
      settled = true;
      tokenAwaiters.delete(listener);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      resolve(token);
    };

    tokenAwaiters.add(listener);

    timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      tokenAwaiters.delete(listener);
      resolve(latestFcmToken);
    }, Math.max(500, timeoutMs));
  });
};
