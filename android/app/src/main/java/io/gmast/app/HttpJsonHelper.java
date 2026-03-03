package io.gmast.app;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public final class HttpJsonHelper {
    private HttpJsonHelper() {}

    public static JSONObject requestJson(String method, String url, String token, JSONObject body) throws Exception {
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

    private static String readResponseBody(InputStream inputStream) throws Exception {
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
}
