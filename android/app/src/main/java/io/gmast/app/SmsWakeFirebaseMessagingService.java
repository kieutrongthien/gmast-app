package io.gmast.app;

import android.util.Log;
import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONObject;

import java.io.DataOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class SmsWakeFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "SMS_WAKE_FCM";
    private static final String UNIQUE_WORK_NAME = "sms_queue_wake_work";
    private static final String CAPACITOR_STORAGE = "CapacitorStorage";
    private static final String AUTH_SESSION_KEY = "gmast::auth-session";
    private static final String API_BASE_URL_KEY = "gmast::api-base-url";
    private static final String LAST_FCM_TOKEN_KEY = "gmast::last-fcm-token-native";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.w(TAG, "onNewToken length=" + token.length());

        try {
            persistLatestToken(token);
            boolean synced = syncTokenToBackend(token);
            Log.w(TAG, "onNewToken sync result=" + synced);
        } catch (Exception exception) {
            Log.w(TAG, "onNewToken sync failed", exception);
        }
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        Log.w(TAG, "onMessageReceived data=" + data);

        if (!shouldWakeSmsPipeline(data)) {
            Log.w(TAG, "message ignored (no wake flag/event)");
            return;
        }

        Data inputData = new Data.Builder()
            .putString("event", valueOrEmpty(data.get("event")))
            .putString("wakeSmsQueue", valueOrEmpty(data.get("wakeSmsQueue")))
            .putString("wakeSendPipeline", valueOrEmpty(data.get("wakeSendPipeline")))
            .putString("wake", valueOrEmpty(data.get("wake")))
            .putString("rawData", data.toString())
            .build();

        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(SmsWakeWorker.class)
            .setInputData(inputData)
            .build();

        WorkManager.getInstance(getApplicationContext())
            .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.REPLACE, request);

        Log.w(TAG, "wake work enqueued");
    }

    private boolean shouldWakeSmsPipeline(Map<String, String> data) {
        String event = normalize(data.get("event"));
        String type = normalize(data.get("type"));

        if ("sms_queue_wake".equals(event) || "sms-wake".equals(event) || "sms_send_wake".equals(event)) {
            return true;
        }

        if ("sms_queue_wake".equals(type) || "sms-wake".equals(type) || "sms_send_wake".equals(type)) {
            return true;
        }

        return parseBoolean(data.get("wakeSmsQueue"))
            || parseBoolean(data.get("wakeSendPipeline"))
            || parseBoolean(data.get("wake"));
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase();
    }

    private boolean parseBoolean(String value) {
        if (value == null) {
            return false;
        }

        String normalized = value.trim().toLowerCase();
        return "1".equals(normalized)
            || "true".equals(normalized)
            || "yes".equals(normalized)
            || "on".equals(normalized);
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private void persistLatestToken(String token) {
        SharedPreferences storage = getApplicationContext().getSharedPreferences(CAPACITOR_STORAGE, Context.MODE_PRIVATE);
        storage.edit().putString(LAST_FCM_TOKEN_KEY, token).apply();
    }

    private boolean syncTokenToBackend(String token) {
        SessionConfig session = readSessionConfig();
        if (session == null) {
            Log.w(TAG, "skip token sync: missing auth session or api base");
            return false;
        }

        HttpURLConnection connection = null;
        try {
            URL endpoint = new URL(session.baseUrl + "/save-fcm-token");
            connection = (HttpURLConnection) endpoint.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(12_000);
            connection.setReadTimeout(12_000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + session.token);
            connection.setRequestProperty("Content-Type", "application/json");

            JSONObject payload = new JSONObject();
            payload.put("token", token);
            payload.put("platform", "android");

            byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
            try (DataOutputStream stream = new DataOutputStream(connection.getOutputStream())) {
                stream.write(bytes);
                stream.flush();
            }

            int status = connection.getResponseCode();
            if (status >= 200 && status < 300) {
                return true;
            }

            Log.w(TAG, "save-fcm-token failed status=" + status);
            return false;
        } catch (Exception exception) {
            Log.w(TAG, "save-fcm-token request failed", exception);
            return false;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private SessionConfig readSessionConfig() {
        SharedPreferences storage = getApplicationContext().getSharedPreferences(CAPACITOR_STORAGE, Context.MODE_PRIVATE);
        String apiBaseUrl = trim(storage.getString(API_BASE_URL_KEY, null));
        String rawSession = storage.getString(AUTH_SESSION_KEY, null);

        if (apiBaseUrl == null || rawSession == null) {
            return null;
        }

        try {
            JSONObject session = new JSONObject(rawSession);
            String token = trim(session.optString("token", null));
            if (token == null) {
                return null;
            }

            return new SessionConfig(apiBaseUrl, token);
        } catch (Exception exception) {
            Log.w(TAG, "failed to parse auth session for token sync", exception);
            return null;
        }
    }

    private String trim(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private static class SessionConfig {
        final String baseUrl;
        final String token;

        SessionConfig(String baseUrl, String token) {
            this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
            this.token = token;
        }
    }
}
