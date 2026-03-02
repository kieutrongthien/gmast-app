package io.gmast.app;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsPermission",
    permissions = {
        @Permission(alias = "sendSms", strings = { Manifest.permission.SEND_SMS })
    }
)
public class SmsPermissionPlugin extends Plugin {

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("sendSms", getPermissionState("sendSms").toString().toLowerCase());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        PermissionState current = getPermissionState("sendSms");
        if (current == PermissionState.GRANTED) {
            checkPermissions(call);
            return;
        }

        requestPermissionForAlias("sendSms", call, "smsPermissionCallback");
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        checkPermissions(call);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject("Unable to open app settings", exception);
        }
    }
}
