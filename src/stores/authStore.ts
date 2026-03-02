import { computed, reactive } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { setTokenOverride } from '@/services/auth/tokenManager';
import { getMobileUserInfo, loginMobile } from '@/services/mobile';

const AUTH_SESSION_KEY = 'gmast::auth-session';

interface AuthSession {
  token: string;
  tokenType: string;
  username: string;
}

interface AuthState {
  session: AuthSession | null;
  userProfile: Record<string, unknown> | null;
  loading: boolean;
  hydrated: boolean;
  error: string | null;
}

const state = reactive<AuthState>({
  session: null,
  userProfile: null,
  loading: false,
  hydrated: false,
  error: null
});

const applySession = async (session: AuthSession | null): Promise<void> => {
  state.session = session;

  if (!session) {
    setTokenOverride(null);
    return;
  }

  setTokenOverride({
    token: session.token,
    tokenType: session.tokenType
  });
};

const persistSession = async (session: AuthSession | null): Promise<void> => {
  if (!session) {
    await Preferences.remove({ key: AUTH_SESSION_KEY });
    return;
  }

  await Preferences.set({
    key: AUTH_SESSION_KEY,
    value: JSON.stringify(session)
  });
};

const parseStoredSession = (raw: string | null): AuthSession | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed?.token || !parsed?.tokenType || !parsed?.username) {
      return null;
    }

    return {
      token: parsed.token,
      tokenType: parsed.tokenType,
      username: parsed.username
    };
  } catch (_error) {
    return null;
  }
};

export const hydrateAuthSession = async (): Promise<void> => {
  if (state.hydrated) {
    return;
  }

  state.loading = true;
  state.error = null;

  try {
    const stored = await Preferences.get({ key: AUTH_SESSION_KEY });
    const session = parseStoredSession(stored.value);

    await applySession(session);

    if (session) {
      const profile = await getMobileUserInfo(session.token);
      state.userProfile = profile.data;
    }
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    await applySession(null);
    state.userProfile = null;
    await persistSession(null);
  } finally {
    state.loading = false;
    state.hydrated = true;
  }
};

export const loginWithCredentials = async (username: string, password: string): Promise<void> => {
  state.loading = true;
  state.error = null;

  try {
    const normalizedUsername = username.trim();
    const loginResult = await loginMobile(
      {
        username: normalizedUsername,
        password
      },
      { persistAsActiveSession: true }
    );

    const session: AuthSession = {
      token: loginResult.token,
      tokenType: loginResult.tokenType,
      username: normalizedUsername
    };

    await applySession(session);
    await persistSession(session);

    const profile = await getMobileUserInfo(session.token);
    state.userProfile = profile.data;
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    state.loading = false;
    state.hydrated = true;
  }
};

export const logoutAuthSession = async (): Promise<void> => {
  state.loading = true;
  state.error = null;

  try {
    await applySession(null);
    state.userProfile = null;
    await persistSession(null);
  } finally {
    state.loading = false;
    state.hydrated = true;
  }
};

export const authStore = {
  state,
  isAuthenticated: computed(() => Boolean(state.session?.token)),
  authLoading: computed(() => state.loading),
  authError: computed(() => state.error),
  username: computed(() => state.session?.username ?? null),
  userProfile: computed(() => state.userProfile),
  hydrate: hydrateAuthSession,
  login: loginWithCredentials,
  logout: logoutAuthSession
};
