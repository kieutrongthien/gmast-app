package io.gmast.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Iterator;
import java.util.concurrent.ThreadLocalRandom;

public class SmsWakeWorker extends Worker {
    private static final String TAG = "SMS_WAKE_WORKER";
    private static final String PREF_NAME = "sms_wake_debug";
    private static final String PREF_LAST_PAYLOAD = "last_payload";
    private static final String PREF_LAST_TS = "last_timestamp";
    private static final String PREF_RATE_LOG = "sms_rate_timestamps";
    private static final long RATE_WINDOW_MS = 60_000L;
    private static final int MAX_SMS_PER_MINUTE = 6;
    private static final long MIN_SMS_INTERVAL_MS = 9_000L;
    private static final long MAX_SMS_INTERVAL_MS = 11_000L;
    private static final String BATCH_NOTIFICATION_CHANNEL_ID = "sms_batch_result_channel";

    private enum RuntimeStatus {
        PENDING,
        PROCESSING,
        FAILED,
        SENT,
        UNKNOWN
    }

    private static class PendingSmsTask {
        final int scheduleId;
        final String receiver;
        final String message;

        PendingSmsTask(int scheduleId, String receiver, String message) {
            this.scheduleId = scheduleId;
            this.receiver = receiver;
            this.message = message;
        }
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

            android.content.SharedPreferences preferences = getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
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
        AppStorageHelper.SessionConfig session = AppStorageHelper.readSessionConfig(getApplicationContext(), TAG);
        if (session == null) {
            Log.w(TAG, "processWakeBatch skipped: missing api base url or auth session");
            return 0;
        }

        JSONArray schedules = fetchScheduleList(session);
        if (schedules == null) {
            Log.w(TAG, "processWakeBatch skipped: empty schedule list payload");
            return 0;
        }

        List<PendingSmsTask> sendableTasks = extractSendableTasks(schedules);
        AppStorageHelper.SendConfigSnapshot sendConfig = AppStorageHelper.readSendConfig(getApplicationContext(), TAG);
        int processed = 0;

        for (int index = 0; index < sendableTasks.size(); index += 1) {
            PendingSmsTask task = sendableTasks.get(index);

            enforceRateLimitBeforeSend();

            if (processSingleSchedule(session, task, sendConfig)) {
                processed += 1;
            }
        }

        return processed;
    }

    private JSONArray fetchScheduleList(AppStorageHelper.SessionConfig session) throws Exception {
        JSONObject payload = HttpJsonHelper.requestJson(
            "GET",
            session.baseUrl + "/sms-schedules?status=pending",
            session.token,
            null
        );

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

    private List<PendingSmsTask> extractSendableTasks(JSONArray schedules) {
        List<PendingSmsTask> tasks = new ArrayList<>();

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
            if (status != RuntimeStatus.PENDING && status != RuntimeStatus.FAILED) {
                continue;
            }

            String receiver = firstNonBlank(
                asTrimmedString(record.opt("receiver")),
                asTrimmedString(record.opt("phone")),
                asTrimmedString(record.opt("phone_number"))
            );
            String message = firstNonBlank(
                asTrimmedString(record.opt("message")),
                asTrimmedString(record.opt("content")),
                asTrimmedString(record.opt("body"))
            );

            if (receiver == null || message == null) {
                Log.w(TAG, "skip schedule " + scheduleId + " due to missing receiver/message");
                continue;
            }

            tasks.add(new PendingSmsTask(scheduleId, receiver, message));
        }

        return tasks;
    }

    private boolean processSingleSchedule(
        AppStorageHelper.SessionConfig session,
        PendingSmsTask task,
        AppStorageHelper.SendConfigSnapshot sendConfig
    ) {
        RuntimeStatus beforeClaim = readCurrentStatus(session, task.scheduleId);
        if (beforeClaim == RuntimeStatus.SENT) {
            Log.w(TAG, "schedule " + task.scheduleId + " already sent by another processor, skip");
            return false;
        }

        if (beforeClaim == RuntimeStatus.PROCESSING) {
            Log.w(TAG, "schedule " + task.scheduleId + " already processing on another device, skip");
            return false;
        }

        boolean movedToProcessing = transitionScheduleStatus(session, task.scheduleId, "processing", false);
        if (!movedToProcessing) {
            Log.w(TAG, "schedule " + task.scheduleId + " could not move to processing");
            RuntimeStatus latest = readCurrentStatus(session, task.scheduleId);
            if (latest == RuntimeStatus.SENT || latest == RuntimeStatus.PROCESSING) {
                Log.w(TAG, "schedule " + task.scheduleId + " moved by another processor to " + latest + ", skip");
                return false;
            }
            return false;
        }

        RuntimeStatus beforeSend = readCurrentStatus(session, task.scheduleId);
        if (beforeSend != RuntimeStatus.PROCESSING) {
            Log.w(TAG, "schedule " + task.scheduleId + " no longer processing before send, current=" + beforeSend);
            return false;
        }

        boolean smsSent = sendSmsUsingConfig(task, sendConfig);

        if (smsSent) {
            boolean movedToSent = transitionScheduleStatus(session, task.scheduleId, "sent", false);
            if (movedToSent) {
                return true;
            }

            RuntimeStatus latest = readCurrentStatus(session, task.scheduleId);
            if (latest == RuntimeStatus.SENT) {
                Log.w(TAG, "schedule " + task.scheduleId + " already marked sent by another processor");
                return true;
            }

            Log.w(TAG, "schedule " + task.scheduleId + " sent locally but failed to mark sent, current=" + latest);
            return false;
        }

        RuntimeStatus beforeFail = readCurrentStatus(session, task.scheduleId);
        if (beforeFail == RuntimeStatus.SENT) {
            Log.w(TAG, "schedule " + task.scheduleId + " already sent by another processor while local send failed");
            return true;
        }

        transitionScheduleStatus(session, task.scheduleId, "failed", true);
        return false;
    }

    private boolean transitionScheduleStatus(
        AppStorageHelper.SessionConfig session,
        int scheduleId,
        String targetStatus,
        boolean retryIncrementOnFailure
    ) {
        RuntimeStatus current = readCurrentStatus(session, scheduleId);

        for (int step = 0; step < 8; step += 1) {
            String next = resolveNextStatus(current, targetStatus);
            if (next == null) {
                return matchesTargetStatus(current, targetStatus);
            }

            try {
                JSONObject requestBody = new JSONObject();
                requestBody.put("status", next);
                requestBody.put("retry_increment", "failed".equals(next) && retryIncrementOnFailure);

                HttpJsonHelper.requestJson(
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

    private boolean sendSmsUsingConfig(
        PendingSmsTask task,
        AppStorageHelper.SendConfigSnapshot sendConfig
    ) {
        boolean sent = SmsDispatchHelper.sendSms(
            getApplicationContext(),
            task.receiver,
            task.message,
            sendConfig,
            TAG
        );

        recordSendAttemptTimestamp();

        if (sent) {
            Log.w(TAG, "sms sent schedule=" + task.scheduleId + " receiver=" + task.receiver);
        } else {
            Log.w(TAG, "failed to send sms schedule=" + task.scheduleId);
        }

        return sent;
    }

    private void enforceRateLimitBeforeSend() {
        while (true) {
            long now = System.currentTimeMillis();
            List<Long> recentTimestamps = readRecentSendTimestamps(now);

            long waitForWindowMs = 0L;
            if (recentTimestamps.size() >= MAX_SMS_PER_MINUTE) {
                long oldestInWindow = recentTimestamps.get(0);
                waitForWindowMs = Math.max(0L, (oldestInWindow + RATE_WINDOW_MS) - now);
            }

            long waitForGapMs = 0L;
            if (!recentTimestamps.isEmpty()) {
                long lastSentAt = recentTimestamps.get(recentTimestamps.size() - 1);
                long elapsedSinceLast = now - lastSentAt;
                long targetGap = ThreadLocalRandom.current().nextLong(MIN_SMS_INTERVAL_MS, MAX_SMS_INTERVAL_MS + 1);
                waitForGapMs = Math.max(0L, targetGap - elapsedSinceLast);
            }

            long waitMs = Math.max(waitForWindowMs, waitForGapMs);
            if (waitMs <= 0L) {
                return;
            }

            Log.w(TAG, "rate limit active, waiting " + waitMs + "ms before next SMS");

            try {
                Thread.sleep(waitMs);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                Log.w(TAG, "rate limit wait interrupted", interruptedException);
                return;
            }
        }
    }

    private void recordSendAttemptTimestamp() {
        long now = System.currentTimeMillis();
        List<Long> timestamps = readRecentSendTimestamps(now);
        timestamps.add(now);
        saveSendTimestamps(timestamps);
    }

    private List<Long> readRecentSendTimestamps(long now) {
        android.content.SharedPreferences preferences = getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String raw = AppStorageHelper.trimToNull(preferences.getString(PREF_RATE_LOG, null));

        List<Long> timestamps = new ArrayList<>();
        if (raw != null) {
            String[] parts = raw.split(",");
            for (String part : parts) {
                String normalized = AppStorageHelper.trimToNull(part);
                if (normalized == null) {
                    continue;
                }

                try {
                    long value = Long.parseLong(normalized);
                    if (value > 0L) {
                        timestamps.add(value);
                    }
                } catch (Exception ignored) {
                    // ignore malformed timestamp entry
                }
            }
        }

        long windowStart = now - RATE_WINDOW_MS;
        Iterator<Long> iterator = timestamps.iterator();
        while (iterator.hasNext()) {
            Long value = iterator.next();
            if (value == null || value < windowStart) {
                iterator.remove();
            }
        }

        saveSendTimestamps(timestamps);
        return timestamps;
    }

    private void saveSendTimestamps(List<Long> timestamps) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < timestamps.size(); i += 1) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(timestamps.get(i));
        }

        android.content.SharedPreferences preferences = getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        preferences.edit().putString(PREF_RATE_LOG, builder.toString()).apply();
    }

    private boolean matchesTargetStatus(RuntimeStatus current, String targetStatus) {
        if ("processing".equals(targetStatus)) {
            return current == RuntimeStatus.PROCESSING;
        }
        if ("sent".equals(targetStatus)) {
            return current == RuntimeStatus.SENT;
        }
        if ("failed".equals(targetStatus)) {
            return current == RuntimeStatus.FAILED;
        }
        if ("pending".equals(targetStatus)) {
            return current == RuntimeStatus.PENDING;
        }
        return false;
    }

    private void showBatchResultNotification(int processedCount, Exception error) {
        try {
            if (processedCount <= 0 && error == null) {
                Log.w(TAG, "batch result notification skipped: no processed SMS and no error");
                return;
            }

            ensureBatchNotificationChannel();
            String locale = AppStorageHelper.readLocale(getApplicationContext());

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

    private RuntimeStatus readCurrentStatus(AppStorageHelper.SessionConfig session, int scheduleId) {
        try {
            JSONObject detail = HttpJsonHelper.requestJson(
                "GET",
                session.baseUrl + "/sms-schedules/" + scheduleId,
                session.token,
                null
            );
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
        if ("processing".equals(target)) {
            if (current == RuntimeStatus.PROCESSING) {
                return null;
            }
            if (current == RuntimeStatus.PENDING) {
                return "processing";
            }
            if (current == RuntimeStatus.FAILED) {
                return "pending";
            }
            if (current == RuntimeStatus.SENT) {
                return null;
            }
            return "processing";
        }

        if ("failed".equals(target)) {
            if (current == RuntimeStatus.FAILED) {
                return null;
            }
            if (current == RuntimeStatus.PENDING || current == RuntimeStatus.PROCESSING) {
                return "failed";
            }
            if (current == RuntimeStatus.SENT) {
                return null;
            }
            return "failed";
        }

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

        String normalized = AppStorageHelper.trimToNull(value == null ? null : String.valueOf(value));
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

    private String asTrimmedString(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number) {
            return String.valueOf(value);
        }

        if (value instanceof String) {
            return AppStorageHelper.trimToNull((String) value);
        }

        return null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            String normalized = AppStorageHelper.trimToNull(value);
            if (normalized != null) {
                return normalized;
            }
        }
        return null;
    }

    private Integer parseInteger(String raw) {
        String normalized = AppStorageHelper.trimToNull(raw);
        if (normalized == null) {
            return null;
        }

        try {
            return Integer.parseInt(normalized);
        } catch (Exception ignored) {
            return null;
        }
    }

}
