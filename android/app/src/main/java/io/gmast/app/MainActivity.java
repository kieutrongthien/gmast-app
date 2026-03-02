package io.gmast.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "SMS_WAKE_MAIN";
    private static final String SMS_WAKE_ACTION = "io.gmast.app.SMS_QUEUE_WAKE";

    private final BroadcastReceiver smsWakeReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String event = intent.getStringExtra("event");
            String rawData = intent.getStringExtra("rawData");
            Log.w(TAG, "received wake broadcast event=" + event + " rawData=" + rawData);
        }
    };

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		IntentFilter wakeIntentFilter = new IntentFilter(SMS_WAKE_ACTION);
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
			registerReceiver(smsWakeReceiver, wakeIntentFilter, Context.RECEIVER_NOT_EXPORTED);
		} else {
			registerReceiver(smsWakeReceiver, wakeIntentFilter);
		}
		Log.w(TAG, "sms wake receiver registered");
		requestIgnoreBatteryOptimizations();
	}

	@Override
	public void onDestroy() {
		super.onDestroy();
		try {
			unregisterReceiver(smsWakeReceiver);
		} catch (Exception ignored) {
			// ignore if receiver was not registered
		}
	}

	private void requestIgnoreBatteryOptimizations() {
		if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
			return;
		}

		try {
			PowerManager powerManager = getSystemService(PowerManager.class);
			if (powerManager == null) {
				return;
			}

			String packageName = getPackageName();
			if (powerManager.isIgnoringBatteryOptimizations(packageName)) {
				return;
			}

			Intent intent = new Intent(
				Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
				Uri.parse("package:" + packageName)
			);
			startActivity(intent);
		} catch (Exception ignored) {
			// ignore device-specific failures
		}
	}
}
