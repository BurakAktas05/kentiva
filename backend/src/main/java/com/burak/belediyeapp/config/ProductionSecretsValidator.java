package com.burak.belediyeapp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Production ortamında zorunlu gizlilerin tanımlı olduğunu doğrular.
 */
@Slf4j
@Component
@Profile("prod")
public class ProductionSecretsValidator {

    private static final String PLACEHOLDER_JWT = "change-me-to-a-secure-base64-key";

    @Value("${app.security.jwt.secret:}")
    private String jwtSecret;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    @Value("${DATABASE_URL:}")
    private String databaseUrl;

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${app.storage.s3.access-key:}")
    private String s3AccessKey;

    @Value("${app.storage.s3.secret-key:}")
    private String s3SecretKey;

    @EventListener(ApplicationReadyEvent.class)
    public void validateRequiredSecrets() {
        if (jwtSecret == null || jwtSecret.isBlank() || PLACEHOLDER_JWT.equalsIgnoreCase(jwtSecret.trim())) {
            throw new IllegalStateException(
                    "JWT_SECRET ortam değişkeni production için zorunludur (openssl rand -base64 64).");
        }
        if (!isDatabaseConfigured()) {
            throw new IllegalStateException(
                    "DB_PASSWORD, BELEDIYE_DB_URL veya DATABASE_URL (postgresql://) production için zorunludur.");
        }
        if ("s3".equalsIgnoreCase(storageType)) {
            if (s3AccessKey == null || s3AccessKey.isBlank() || s3SecretKey == null || s3SecretKey.isBlank()) {
                throw new IllegalStateException(
                        "APP_STORAGE_TYPE=s3 iken S3_ACCESS_KEY ve S3_SECRET_KEY tanımlanmalıdır.");
            }
        }
        log.info("Production secret validation passed.");
    }

    private boolean isDatabaseConfigured() {
        if (dbPassword != null && !dbPassword.isBlank()) {
            return true;
        }
        String url = datasourceUrl != null && !datasourceUrl.isBlank() ? datasourceUrl : databaseUrl;
        return url != null
                && !url.isBlank()
                && (url.startsWith("jdbc:") || url.startsWith("postgres://") || url.startsWith("postgresql://"));
    }
}
