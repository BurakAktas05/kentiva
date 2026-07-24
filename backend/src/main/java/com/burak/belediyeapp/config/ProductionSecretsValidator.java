package com.burak.belediyeapp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Production ortaminda zorunlu gizlilerin tanimli oldugunu dogrular.
 */
@Slf4j
@Component
@Profile("prod")
public class ProductionSecretsValidator {

    private static final String PLACEHOLDER_JWT = "change-me-to-a-secure-base64-key";
    private static final int MIN_SECRET_LENGTH = 32;

    @Value("${app.security.jwt.secret:}")
    private String jwtSecret;

    @Value("${app.setup.token:}")
    private String setupToken;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    @Value("${DATABASE_URL:}")
    private String databaseUrl;

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${app.public-base-url:}")
    private String publicBaseUrl;

    @Value("${app.storage.s3.access-key:}")
    private String s3AccessKey;

    @Value("${app.storage.s3.secret-key:}")
    private String s3SecretKey;

    @Value("${app.storage.s3.bucket-name:}")
    private String s3BucketName;

    @Value("${app.cache.type:none}")
    private String cacheType;

    @Value("${REDIS_URL:}")
    private String redisUrl;

    @Value("${spring.data.redis.host:}")
    private String redisHost;

    @Value("${app.cors.allowed-origins:}")
    private String corsAllowedOrigins;

    @Value("${app.cors.allowed-origin-patterns:}")
    private String corsAllowedOriginPatterns;

    @Value("${app.ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.firebase.config-base64:}")
    private String firebaseConfigBase64;

    @Value("${app.sms.provider:none}")
    private String smsProvider;

    @Value("${app.sms.netgsm.usercode:}")
    private String netgsmUsercode;

    @Value("${app.sms.netgsm.password:}")
    private String netgsmPassword;

    @Value("${app.sms.netgsm.msgheader:}")
    private String netgsmHeader;

    @Value("${app.sms.otp.dev-bypass-enabled:false}")
    private boolean smsOtpDevBypassEnabled;

    @Value("${app.media-guard.fail-open:true}")
    private boolean mediaGuardFailOpen;

    @Value("${app.media-validation.fail-open:true}")
    private boolean mediaValidationFailOpen;

    @Value("${app.media-anonymization.fail-open:true}")
    private boolean mediaAnonymizationFailOpen;

    @Value("${app.production.require-durable-storage:true}")
    private boolean requireDurableStorage;

    @Value("${app.production.require-distributed-cache:true}")
    private boolean requireDistributedCache;

    @Value("${app.production.require-durable-messaging:true}")
    private boolean requireDurableMessaging;

    @Value("${app.messaging.rabbit.enabled:false}")
    private boolean rabbitMessagingEnabled;

    @Value("${spring.rabbitmq.host:}")
    private String rabbitHost;

    @Value("${spring.rabbitmq.username:}")
    private String rabbitUsername;

    @Value("${spring.rabbitmq.password:}")
    private String rabbitPassword;

    @Value("${app.security.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    @EventListener(ApplicationReadyEvent.class)
    public void validateRequiredSecrets() {
        assertValidJwtSecret();
        assertValidSetupToken();
        if (!isDatabaseConfigured()) {
            throw new IllegalStateException(
                    "DB sifresi veya DATABASE_URL production icin zorunludur.");
        }
        assertValidPublicBaseUrl();
        assertValidStorageConfiguration();
        assertValidCacheConfiguration();
        assertValidMessagingConfiguration();
        assertValidCorsConfiguration();
        assertValidSmsConfiguration();
        assertFailClosedMediaConfiguration();
        assertRateLimitEnabled();


        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("GEMINI_API_KEY tanimlanmadi. AI ozellikleri devre disi kalacak.");
        }
        if (firebaseConfigBase64 == null || firebaseConfigBase64.isBlank()) {
            log.warn("FIREBASE_CONFIG_BASE64 tanimlanmadi. Push bildirimleri devre disi kalacak.");
        }

        log.info("Production secret validation passed.");
    }

    void assertValidJwtSecret() {
        if (jwtSecret == null || jwtSecret.isBlank() || PLACEHOLDER_JWT.equalsIgnoreCase(jwtSecret.trim())) {
            throw new IllegalStateException(
                    "JWT_SECRET production icin zorunludur (openssl rand -base64 64).");
        }
        if (jwtSecret.trim().length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("JWT_SECRET production icin en az 32 karakter olmalidir.");
        }
    }

    void assertValidSetupToken() {
        if (setupToken == null || setupToken.isBlank()) {
            throw new IllegalStateException("APP_SETUP_TOKEN production icin zorunludur.");
        }
        if (setupToken.trim().length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("APP_SETUP_TOKEN production icin en az 32 karakter olmalidir.");
        }
    }

    void assertValidPublicBaseUrl() {
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            throw new IllegalStateException("APP_PUBLIC_URL production icin zorunludur.");
        }
        String normalized = publicBaseUrl.trim().toLowerCase();
        if (!normalized.startsWith("https://")) {
            throw new IllegalStateException("APP_PUBLIC_URL production ortaminda https:// ile baslamalidir.");
        }
    }

    void assertValidStorageConfiguration() {
        if (requireDurableStorage && !"s3".equalsIgnoreCase(storageType)) {
            throw new IllegalStateException(
                    "Production ortaminda kalici medya depolama icin APP_STORAGE_TYPE=s3 kullanilmalidir.");
        }
        if ("s3".equalsIgnoreCase(storageType)
                && (isBlank(s3AccessKey) || isBlank(s3SecretKey) || isBlank(s3BucketName))) {
            throw new IllegalStateException(
                    "APP_STORAGE_TYPE=s3 iken S3_ACCESS_KEY, S3_SECRET_KEY ve S3_BUCKET_NAME tanimlanmalidir.");
        }
    }

    void assertValidCacheConfiguration() {
        if (requireDistributedCache && !"redis".equalsIgnoreCase(cacheType)) {
            throw new IllegalStateException(
                    "Production ortaminda dagitik durum yonetimi icin APP_CACHE_TYPE=redis kullanilmalidir.");
        }
        if ("redis".equalsIgnoreCase(cacheType) && isBlank(redisUrl) && isBlank(redisHost)) {
            throw new IllegalStateException(
                    "APP_CACHE_TYPE=redis iken REDIS_URL veya spring.data.redis.host tanimlanmalidir.");
        }
    }

    void assertValidMessagingConfiguration() {
        if (!requireDurableMessaging) {
            return;
        }
        if (!rabbitMessagingEnabled) {
            throw new IllegalStateException(
                    "Production ortaminda APP_MESSAGING_RABBIT_ENABLED=true olmalidir.");
        }
        if (isBlank(rabbitHost) || isBlank(rabbitUsername) || isBlank(rabbitPassword)) {
            throw new IllegalStateException(
                    "RabbitMQ etkin iken RABBITMQ_HOST, RABBITMQ_USERNAME ve RABBITMQ_PASSWORD tanimlanmalidir.");
        }
    }

    void assertValidCorsConfiguration() {
        if ((corsAllowedOrigins == null || corsAllowedOrigins.isBlank())
                && (corsAllowedOriginPatterns == null || corsAllowedOriginPatterns.isBlank())) {
            throw new IllegalStateException(
                    "APP_CORS_ALLOWED_ORIGINS veya APP_CORS_ALLOWED_ORIGIN_PATTERNS production icin zorunludur.");
        }

        for (String origin : splitCsv(corsAllowedOrigins)) {
            if (!origin.startsWith("https://") || isLocalHostOrigin(origin)) {
                throw new IllegalStateException(
                        "Production CORS originleri yalnizca https adresleri icermelidir: " + origin);
            }
        }

        for (String pattern : splitCsv(corsAllowedOriginPatterns)) {
            if ("*".equals(pattern) || !pattern.startsWith("https://") || isLocalHostOrigin(pattern)) {
                throw new IllegalStateException(
                        "Production CORS origin patternleri genel wildcard veya lokal adres iceremez: " + pattern);
            }
        }
    }

    void assertFailClosedMediaConfiguration() {
        if (mediaGuardFailOpen || mediaValidationFailOpen || mediaAnonymizationFailOpen) {
            throw new IllegalStateException(
                    "Production ortaminda medya koruma servisleri fail-open calisamaz; MEDIA_GUARD_FAIL_OPEN, MEDIA_VALIDATION_FAIL_OPEN ve MEDIA_ANONYMIZATION_FAIL_OPEN false olmalidir.");
        }
    }

    void assertValidSmsConfiguration() {
        if (smsOtpDevBypassEnabled) {
            throw new IllegalStateException("Production ortaminda SMS_OTP_DEV_BYPASS_ENABLED false olmalidir.");
        }
        if (!"netgsm".equalsIgnoreCase(smsProvider)) {
            throw new IllegalStateException("Production ortaminda SMS_PROVIDER=netgsm tanimlanmalidir.");
        }
        if (isBlank(netgsmUsercode) || isBlank(netgsmPassword) || isBlank(netgsmHeader)) {
            throw new IllegalStateException(
                    "SMS_PROVIDER=netgsm iken NETGSM_USERCODE, NETGSM_PASSWORD ve NETGSM_MSGHEADER tanimlanmalidir.");
        }
    }

    void assertRateLimitEnabled() {
        if (!rateLimitEnabled) {
            throw new IllegalStateException(
                    "Production ortaminda APP_SECURITY_RATE_LIMIT_ENABLED false olamaz.");
        }
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

    private java.util.List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return java.util.List.of();
        }
        return java.util.Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(entry -> !entry.isBlank())
                .toList();
    }

    private boolean isLocalHostOrigin(String value) {
        String normalized = value.toLowerCase();
        return normalized.contains("localhost") || normalized.contains("127.0.0.1");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
