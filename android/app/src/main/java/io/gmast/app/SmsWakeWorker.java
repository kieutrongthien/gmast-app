package io.gmast.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public class SmsWakeWorker extends Worker {
    private static final String TAG = "SMS_WAKE_WORKER";
    private static final String PREF_NAME = "sms_wake_debug";
    private static final String PREF_LAST_PAYLOAD = "last_payload";
    private static final String PREF_LAST_TS = "last_timestamp";
    private static final String CAPACITOR_STORAGE = "CapacitorStorage";
    private static final String AUTH_SESSION_KEY = "gmast::auth-session";
    private static final String API_BASE_URL_KEY = "gmast::api-base-url";
    private static final String LOCALE_KEY = "gmast::locale";
    private static final long MIN_SMS_INTERVAL_MS = 3_000L;
    private static final long MAX_SMS_INTERVAL_MS = 5_000L;
    private static final String BATCH_NOTIFICATION_CHANNEL_ID = "sms_batch_result_channel";

    private enum RuntimeStatus {
        PENDING,
        PROCESSING,
        FAILED,
        SENT,
        UNKNOWN
    }

    public SmsWakeWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        String rawData = getInputData().getString("rawData");
        String event = getInputData().getString("event");

        Log.w(TAG, "doWork started event=" + event + " rawData=" + rawData);

        PowerManager.WakeLock wakeLock = null;
        try {
            PowerManager powerManager = (PowerManager) getApplicationContext().getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "gmast:smsWakeWorker");
                wakeLock.acquire(10 * 60_000L);
            }

            SharedPreferences preferences = getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            preferences.edit()
                .putString(PREF_LAST_PAYLOAD, rawData)
                .putLong(PREF_LAST_TS, System.currentTimeMillis())
                .apply();

            int processedCount = processWakeBatch();
            Log.w(TAG, "doWork processed schedules=" + processedCount);
            showBatchResultNotification(processedCount, null);

            Intent wakeIntent = new Intent("io.gmast.app.SMS_QUEUE_WAKE");
            wakeIntent.setPackage(getApplicationContext().getPackageName());
            wakeIntent.putExtra("event", event);
            wakeIntent.putExtra("rawData", rawData);
            wakeIntent.putExtra("processed", processedCount);
            getApplicationContext().sendBroadcast(wakeIntent);

            Log.w(TAG, "doWork broadcast sent");
            return Result.success();
        } catch (Exception exception) {
            Log.e(TAG, "doWork failed", exception);
            showBatchResultNotification(0, exception);
            return Result.retry();
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }

    private int processWakeBatch() throws Exception {
        SessionConfig session = readSessionConfig();
        if (session == null) {
            Log.w(TAG, "processWakeBatch skipped: missing api base url or auth session");
            return 0;
        }

        JSONArray schedules = fetchScheduleList(session);
        if (schedules == null) {
            Log.w(TAG, "processWakeBatch skipped: empty schedule list payload");
            return 0;
        }

        List<Integer> sendableIds = extractSendableIds(schedules);
        int processed = 0;

        for (int index = 0; index < sendableIds.size(); index += 1) {
            Integer scheduleId = sendableIds.get(index);

            if (index > 0) {
                sleepBetweenSms();
            }

            if (progressScheduleToSent(session, scheduleId)) {
                processed += 1;
            }
        }

        return processed;
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
            Log.w(TAG, "failed to parse auth session", exception);
            return null;
        }
    }

    private JSONArray fetchScheduleList(SessionConfig session) throws Exception {
        JSONObject payload = executeRequest("GET", session.baseUrl + "/sms-schedules", session.token, null);

        Object directData = payload.opt("data");
        if (directData instanceof JSONArray) {
            return (JSONArray) directData;
        }

        if (directData instanceof JSONObject) {
            Object nested = ((JSONObject) directData).opt("data");
            if (nested instanceof JSONArray) {
                return (JSONArray) nested;
            }
        }

        Object items = payload.opt("items");
        if (items instanceof JSONArray) {
            return (JSONArray) items;
        }

        return null;
    }

    private List<Integer> extractSendableIds(JSONArray schedules) {
        List<Integer> ids = new ArrayList<>();

        for (int index = 0; index < schedules.length(); index += 1) {
            Object item = schedules.opt(index);
            if (!(item instanceof JSONObject)) {
                continue;
            }

            JSONObject record = (JSONObject) item;
            int scheduleId = pickPositiveInteger(record, "sms_schedule_id", "smsScheduleId", "schedule_id", "id");
            if (scheduleId <= 0) {
                continue;
            }

            RuntimeStatus status = normalizeRuntimeStatus(record.opt("status"));
            if (status == RuntimeStatus.PENDING || status == RuntimeStatus.FAILED) {
                ids.add(scheduleId);
            }
        }

        return ids;
    }

    private boolean progressScheduleToSent(SessionConfig session, int scheduleId) {
        RuntimeStatus current = readCurrentStatus(session, scheduleId);

        for (int step = 0; step < 8; step += 1) {
            String next = resolveNextStatus(current, "sent");
            if (next == null) {
                return current == RuntimeStatus.SENT;
            }

            try {
                JSONObject requestBody = new JSONObject();
                requestBody.put("status", next);
                requestBody.put("retry_increment", false);

                executeRequest(
                    "PATCH",
                    session.baseUrl + "/sms-schedules/" + scheduleId + "/status",
                    session.token,
                    requestBody
                );

                current = normalizeRuntimeStatus(next);
            } catch (Exception exception) {
                Log.w(TAG, "status update failed for id=" + scheduleId + ", refreshing status", exception);
                current = readCurrentStatus(session, scheduleId);
            }
        }

        return false;
    }

    private void sleepBetweenSms() {
        long delayMs = ThreadLocalRandom.current().nextLong(MIN_SMS_INTERVAL_MS, MAX_SMS_INTERVAL_MS + 1);
        Log.w(TAG, "throttling next SMS by " + delayMs + "ms");

        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            Log.w(TAG, "sleepBetweenSms interrupted", interruptedException);
        }
    }

    private void showBatchResultNotification(int processedCount, Exception error) {
        try {
            ensureBatchNotificationChannel();
            String locale = getCurrentLocale();

            String title = resolveLocalizedTitle(locale, error == null);
            String body = resolveLocalizedBody(locale, processedCount, error == null);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), BATCH_NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_more)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true);

            int notificationId = (int) (System.currentTimeMillis() & 0x0FFFFFFF);
            NotificationManagerCompat.from(getApplicationContext()).notify(notificationId, builder.build());
        } catch (SecurityException securityException) {
            Log.w(TAG, "notification permission missing for batch result", securityException);
        } catch (Exception exception) {
            Log.w(TAG, "failed to show batch result notification", exception);
        }
    }

    private String getCurrentLocale() {
        SharedPreferences storage = getApplicationContext().getSharedPreferences(CAPACITOR_STORAGE, Context.MODE_PRIVATE);
        String raw = trim(storage.getString(LOCALE_KEY, null));
        if (raw == null) {
            return "en";
        }

        String lowered = raw.toLowerCase();
        if ("ko".equals(lowered)) {
            return "ko";
        }
        return "en";
    }

    private String resolveLocalizedTitle(String locale, boolean success) {
        if ("ko".equals(locale)) {
            return success ? "SMS 처리 완료" : "SMS 처리 오류";
        }

        return success ? "SMS batch completed" : "SMS batch failed";
    }

    private String resolveLocalizedBody(String locale, int processedCount, boolean success) {
        if ("ko".equals(locale)) {
            if (!success) {
                return "SMS 처리 중 오류가 발생했습니다. 워커가 다시 시도합니다.";
            }

            if (processedCount > 0) {
                return "이번 배치에서 SMS " + processedCount + "건을 처리했습니다.";
            }

            return "이번 배치에서 처리할 SMS가 없습니다.";
        }

        if (!success) {
            return "An error occurred during SMS processing. The worker will retry.";
        }

        if (processedCount > 0) {
            return "Processed " + processedCount + " SMS in this batch.";
        }

        return "No SMS to process in this batch.";
    }

    private void ensureBatchNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager notificationManager =
            (NotificationManager) getApplicationContext().getSystemService(Context.NOTIFICATION_SERVICE);

        if (notificationManager == null) {
            return;
        }

        NotificationChannel existing = notificationManager.getNotificationChannel(BATCH_NOTIFICATION_CHANNEL_ID);
        if (existing != null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            BATCH_NOTIFICATION_CHANNEL_ID,
            "SMS Batch Result",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Thông báo kết quả mỗi đợt xử lý SMS");
        notificationManager.createNotificationChannel(channel);
    }

    private RuntimeStatus readCurrentStatus(SessionConfig session, int scheduleId) {
        try {
            JSONObject detail = executeRequest("GET", session.baseUrl + "/sms-schedules/" + scheduleId, session.token, null);
            Object status = detail.opt("status");

            Object directData = detail.opt("data");
            if (directData instanceof JSONObject) {
                JSONObject dataObject = (JSONObject) directData;
                if (status == null) {
                    status = dataObject.opt("status");
                }

                Object nested = dataObject.opt("data");
                if (status == null && nested instanceof JSONObject) {
                    status = ((JSONObject) nested).opt("status");
                }
            }

            return normalizeRuntimeStatus(status);
        } catch (Exception exception) {
            Log.w(TAG, "failed to read detail for id=" + scheduleId, exception);
            return RuntimeStatus.UNKNOWN;
        }
    }

    private String resolveNextStatus(RuntimeStatus current, String target) {
        if (!"sent".equals(target)) {
            return null;
        }

        if (current == RuntimeStatus.SENT) {
            return null;
        }
        if (current == RuntimeStatus.PENDING) {
            return "processing";
        }
        if (current == RuntimeStatus.PROCESSING) {
            return "sent";
        }
        if (current == RuntimeStatus.FAILED) {
            return "pending";
        }
        return "processing";
    }

    private RuntimeStatus normalizeRuntimeStatus(Object value) {
        if (value instanceof Number) {
            int numeric = ((Number) value).intValue();
            if (numeric == 0) {
                return RuntimeStatus.PENDING;
            }
            if (numeric == 2) {
                return RuntimeStatus.PROCESSING;
            }
            if (numeric == -1) {
                return RuntimeStatus.FAILED;
            }
            if (numeric == 1) {
                return RuntimeStatus.SENT;
            }
            return RuntimeStatus.UNKNOWN;
        }

        String normalized = trim(value == null ? null : String.valueOf(value));
        if (normalized == null) {
            return RuntimeStatus.UNKNOWN;
        }

        String lowered = normalized.toLowerCase();

        if ("pending".equals(lowered) || "0".equals(lowered)) {
            return RuntimeStatus.PENDING;
        }
        if ("processing".equals(lowered) || "2".equals(lowered) || "sending".equals(lowered)) {
            return RuntimeStatus.PROCESSING;
        }
        if ("failed".equals(lowered) || "-1".equals(lowered)) {
            return RuntimeStatus.FAILED;
        }
        if ("sent".equals(lowered) || "1".equals(lowered)) {
            return RuntimeStatus.SENT;
        }

        return RuntimeStatus.UNKNOWN;
    }

    private int pickPositiveInteger(JSONObject record, String... keys) {
        for (String key : keys) {
            Object value = record.opt(key);

            if (value instanceof Number) {
                int numeric = ((Number) value).intValue();
                if (numeric > 0) {
                    return numeric;
                }
            }

            if (value instanceof String) {
                try {
                    int numeric = Integer.parseInt(((String) value).trim());
                    if (numeric > 0) {
                        return numeric;
                    }
                } catch (Exception ignored) {
                    // ignore parse failure
                }
            }
        }

        return -1;
    }

    private JSONObject executeRequest(String method, String url, String token, JSONObject body) throws Exception {
        HttpURLConnection connection = null;

        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(12_000);
            connection.setReadTimeout(12_000);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + token);

            if (body != null) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");

                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                try (DataOutputStream outputStream = new DataOutputStream(connection.getOutputStream())) {
                    outputStream.write(bytes);
                    outputStream.flush();
                }
            }

            int status = connection.getResponseCode();
            String responseBody = readResponseBody(
                status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream()
            );

            if (status < 200 || status >= 300) {
                throw new IllegalStateException("HTTP " + status + " " + method + " " + url + " body=" + responseBody);
            }

            if (responseBody == null || responseBody.trim().isEmpty()) {
                return new JSONObject();
            }

            return new JSONObject(responseBody);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private String readResponseBody(InputStream inputStream) throws Exception {
        if (inputStream == null) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
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
