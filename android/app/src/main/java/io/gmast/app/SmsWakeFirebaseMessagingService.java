package io.gmast.app;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONObject;

import java.util.Map;

public class SmsWakeFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "SMS_WAKE_FCM";
    private static final String UNIQUE_WORK_NAME = "sms_queue_wake_work";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.w(TAG, "onNewToken length=" + token.length());

        try {
            AppStorageHelper.saveLastFcmToken(getApplicationContext(), token);
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

    private boolean syncTokenToBackend(String token) {
        AppStorageHelper.SessionConfig session = AppStorageHelper.readSessionConfig(getApplicationContext(), TAG);
        if (session == null) {
            Log.w(TAG, "skip token sync: missing auth session or api base");
            return false;
        }

        try {
            JSONObject payload = new JSONObject();
            payload.put("token", token);
            payload.put("platform", "android");

            HttpJsonHelper.requestJson("POST", session.baseUrl + "/save-fcm-token", session.token, payload);
            return true;
        } catch (Exception exception) {
            Log.w(TAG, "save-fcm-token request failed", exception);
            return false;
        }
    }
}
