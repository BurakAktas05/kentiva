package com.burak.belediyeapp.audit;

import com.burak.belediyeapp.dto.response.auth.AuthResponse;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class AuditSanitizerTest {

    private final AuditSanitizer sanitizer = new AuditSanitizer();

    @Test
    void redactsAuthTokensFromAuditSummary() {
        AuthResponse response = AuthResponse.of(
                "access-secret-token",
                "refresh-secret-token",
                "user-1",
                "admin@example.com",
                "Admin User",
                Set.of("ROLE_ADMIN"),
                "Kadikoy",
                null
        );

        String summary = sanitizer.summarize(response);

        assertThat(summary).contains("user-1");
        assertThat(summary).doesNotContain("access-secret-token");
        assertThat(summary).doesNotContain("refresh-secret-token");
    }

    @Test
    void redactsSecretFieldsInGenericStringPayloads() {
        String summary = sanitizer.summarize("{\"token\":\"abc\",\"secret\":\"xyz\"}");

        assertThat(summary).contains("***REDACTED***");
        assertThat(summary).doesNotContain("\"abc\"");
        assertThat(summary).doesNotContain("\"xyz\"");
    }
}
