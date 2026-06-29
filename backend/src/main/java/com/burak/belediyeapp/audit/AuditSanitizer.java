package com.burak.belediyeapp.audit;

import com.burak.belediyeapp.dto.response.auth.AuthResponse;
import com.burak.belediyeapp.dto.response.user.UserResponse;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class AuditSanitizer {

    private static final int MAX_SUMMARY_LENGTH = 500;
    private static final Pattern JSON_SECRET_PATTERN = Pattern.compile(
            "(?i)(\"(?:accessToken|refreshToken|password|secret|token|fcmToken)\"\\s*:\\s*\")([^\"]*)(\")");
    private static final Pattern KEY_VALUE_SECRET_PATTERN = Pattern.compile(
            "(?i)((?:accessToken|refreshToken|password|secret|token|fcmToken)=)([^,}\\s]+)");

    public String summarize(Object result) {
        if (result == null) {
            return null;
        }
        if (result instanceof AuthResponse authResponse) {
            return truncate("AuthResponse{userId=%s,email=%s,roles=%s,tokenType=%s}".formatted(
                    authResponse.userId(),
                    authResponse.email(),
                    authResponse.roles(),
                    authResponse.tokenType()));
        }
        if (result instanceof UserResponse userResponse) {
            return truncate("UserResponse{id=%s,email=%s,roles=%s,municipality=%s}".formatted(
                    userResponse.id(),
                    userResponse.email(),
                    userResponse.roles(),
                    userResponse.municipality() != null ? userResponse.municipality().id() : null));
        }

        String summary = result.toString();
        summary = JSON_SECRET_PATTERN.matcher(summary).replaceAll("$1***REDACTED***$3");
        summary = KEY_VALUE_SECRET_PATTERN.matcher(summary).replaceAll("$1***REDACTED***");
        return truncate(summary);
    }

    private String truncate(String value) {
        return value.length() > MAX_SUMMARY_LENGTH
                ? value.substring(0, MAX_SUMMARY_LENGTH) + "..."
                : value;
    }
}
