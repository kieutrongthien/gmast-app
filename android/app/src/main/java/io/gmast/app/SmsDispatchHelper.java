package io.gmast.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telephony.SmsManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public final class SmsDispatchHelper {
    private SmsDispatchHelper() {}

    public static boolean sendSms(
        Context context,
        String receiver,
        String message,
        AppStorageHelper.SendConfigSnapshot sendConfig,
        String tag
    ) {
        if (!hasSmsPermission(context)) {
            Log.w(tag, "SEND_SMS permission denied");
            return false;
        }

        SmsManager smsManager = resolveSmsManager(context, sendConfig, tag);
        if (smsManager == null) {
            Log.w(tag, "unable to resolve SmsManager");
            return false;
        }

        try {
            ArrayList<String> parts = smsManager.divideMessage(message);
            if (parts.size() > 1) {
                smsManager.sendMultipartTextMessage(receiver, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(receiver, null, message, null, null);
            }
            return true;
        } catch (Exception exception) {
            Log.w(tag, "failed to send sms", exception);
            return false;
        }
    }

    private static boolean hasSmsPermission(Context context) {
        return context.checkSelfPermission(Manifest.permission.SEND_SMS)
            == PackageManager.PERMISSION_GRANTED;
    }

    private static SmsManager resolveSmsManager(
        Context context,
        AppStorageHelper.SendConfigSnapshot sendConfig,
        String tag
    ) {
        SmsManager baseManager;
        try {
            baseManager = context.getSystemService(SmsManager.class);
        } catch (Exception exception) {
            Log.w(tag, "failed to resolve SmsManager from system service", exception);
            return null;
        }

        if (baseManager == null) {
            Log.w(tag, "SmsManager system service is null");
            return null;
        }

        Integer subscriptionId = resolveSubscriptionId(context, sendConfig, tag);
        if (subscriptionId != null) {
            try {
                return baseManager.createForSubscriptionId(subscriptionId);
            } catch (Exception exception) {
                Log.w(tag, "failed to resolve SmsManager for subscriptionId=" + subscriptionId, exception);
            }
        }

        return baseManager;
    }

    private static Integer resolveSubscriptionId(
        Context context,
        AppStorageHelper.SendConfigSnapshot sendConfig,
        String tag
    ) {
        List<SubscriptionInfo> activeSubscriptions = getActiveSubscriptions(context, tag);
        if (activeSubscriptions.isEmpty()) {
            return null;
        }

        if (sendConfig.isManualMode()) {
            Integer manualId = resolveManualSubscriptionId(sendConfig.simSlotId, activeSubscriptions);
            if (manualId != null) {
                return manualId;
            }
            Log.w(tag, "manual SIM config not found, fallback to random");
        }

        int randomIndex = ThreadLocalRandom.current().nextInt(activeSubscriptions.size());
        return activeSubscriptions.get(randomIndex).getSubscriptionId();
    }

    private static List<SubscriptionInfo> getActiveSubscriptions(Context context, String tag) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) {
            return new ArrayList<>();
        }

        if (context.checkSelfPermission(Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED) {
            return new ArrayList<>();
        }

        try {
            SubscriptionManager manager = context.getSystemService(SubscriptionManager.class);
            if (manager == null) {
                return new ArrayList<>();
            }

            List<SubscriptionInfo> active = manager.getActiveSubscriptionInfoList();
            return active != null ? active : new ArrayList<>();
        } catch (Exception exception) {
            Log.w(tag, "failed to get active subscriptions", exception);
            return new ArrayList<>();
        }
    }

    private static Integer resolveManualSubscriptionId(String simSlotId, List<SubscriptionInfo> activeSubscriptions) {
        if (simSlotId == null) {
            return null;
        }

        Integer parsedNumber = parseInteger(simSlotId);
        if (parsedNumber != null) {
            for (SubscriptionInfo info : activeSubscriptions) {
                if (info.getSubscriptionId() == parsedNumber || info.getSimSlotIndex() == parsedNumber) {
                    return info.getSubscriptionId();
                }
            }
        }

        if (simSlotId.startsWith("slot-") || simSlotId.startsWith("sim-")) {
            Integer slotIndex = parseInteger(simSlotId.replace("slot-", "").replace("sim-", ""));
            if (slotIndex != null) {
                for (SubscriptionInfo info : activeSubscriptions) {
                    if (info.getSimSlotIndex() == slotIndex) {
                        return info.getSubscriptionId();
                    }
                }
            }
        }

        return null;
    }

    private static Integer parseInteger(String raw) {
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
