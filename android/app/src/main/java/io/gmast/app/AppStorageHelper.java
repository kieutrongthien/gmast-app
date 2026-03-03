package io.gmast.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONObject;

public final class AppStorageHelper {
    public static final String CAPACITOR_STORAGE = "CapacitorStorage";
    public static final String AUTH_SESSION_KEY = "gmast::auth-session";
    public static final String API_BASE_URL_KEY = "gmast::api-base-url";
    public static final String SEND_CONFIG_KEY = "gmast::send-config";
    public static final String LOCALE_KEY = "gmast::locale";
    public static final String LAST_FCM_TOKEN_KEY = "gmast::last-fcm-token-native";

    private AppStorageHelper() {}

    public static final class SessionConfig {
        public final String baseUrl;
        public final String token;

        public SessionConfig(String baseUrl, String token) {
            this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
            this.token = token;
        }
    }

    public static final class SendConfigSnapshot {
        public final String simMode;
        public final String simSlotId;

        public SendConfigSnapshot(String simMode, String simSlotId) {
            this.simMode = "manual".equals(simMode) ? "manual" : "random";
            this.simSlotId = simSlotId;
        }

        public boolean isManualMode() {
            return "manual".equals(simMode) && simSlotId != null;
        }
    }

    public static SessionConfig readSessionConfig(Context context, String tag) {
        SharedPreferences storage = context.getSharedPreferences(CAPACITOR_STORAGE, Context.MODE_PRIVATE);
        String apiBaseUrl = trimToNull(storage.getString(API_BASE_URL_KEY, null));
        String rawSession = storage.getString(AUTH_SESSION_KEY, null);

        if (apiBaseUrl == null || rawSession == null) {
            return null;
        }

        try {
            JSONObject session = new JSONObject(rawSession);
            String token = trimToNull(session.optString("token", null));
            if (token == null) {
                return null;
            }

            return new SessionConfig(apiBaseUrl, token);
        } catch (Exception exception) {
            Log.w(tag, "failed to parse auth session", exception);
            return null;
        }
    }

    public static SendConfigSnapshot readSendConfig(Context context, String tag) {
        SharedPreferences storage = context.getSharedPreferences(CAPACITOR_STORAGE, Context.MODE_PRIVATE);
        String rawConfig = storage.getString(SEND_CONFIG_KEY, null);
        if (rawConfig == null) {
            return new SendConfigSnapshot("random", null);
        }

        try {
            JSONObject config = new JSONObject(rawConfig);
            String simMode = trimToNull(config.optString("simMode", null));
            String simSlotId = trimToNull(config.optString("simSlotId", null));
            return new SendConfigSnapshot(simMode, simSlotId);
        } catch (Exception exception) {
            Log.w(tag, "failed to parse send config, fallback random", exception);
            return new SendConfigSnapshot("random", null);
        }
    }

    public static String readLocale(Context context) {
        SharedPreferences storage = context.getSharedPreferences(CAPACITOR_STORAGE, Context.MODE_PRIVATE);
        String raw = trimToNull(storage.getString(LOCALE_KEY, null));
        if (raw == null) {
            return "en";
        }

        return "ko".equals(raw.toLowerCase()) ? "ko" : "en";
    }

    public static void saveLastFcmToken(Context context, String token) {
        SharedPreferences storage = context.getSharedPreferences(CAPACITOR_STORAGE, Context.MODE_PRIVATE);
        storage.edit().putString(LAST_FCM_TOKEN_KEY, token).apply();
    }

    public static String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
