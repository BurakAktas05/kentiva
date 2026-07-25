package com.burak.belediyeapp.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatIllegalStateException;
import static org.assertj.core.api.Assertions.assertThatNoException;

class ProductionSecretsValidatorTest {

    private ProductionSecretsValidator validator;

    @BeforeEach
    void setUp() {
        validator = new ProductionSecretsValidator();
        ReflectionTestUtils.setField(validator, "jwtSecret", "A".repeat(48));
        ReflectionTestUtils.setField(validator, "setupToken", "B".repeat(48));
        ReflectionTestUtils.setField(validator, "dbPassword", "postgres-secret");
        ReflectionTestUtils.setField(validator, "datasourceUrl", "jdbc:postgresql://db.internal:5432/belediyeapp");
        ReflectionTestUtils.setField(validator, "databaseUrl", "");
        ReflectionTestUtils.setField(validator, "storageType", "s3");
        ReflectionTestUtils.setField(validator, "publicBaseUrl", "https://api.kentiva.app");
        ReflectionTestUtils.setField(validator, "s3AccessKey", "access-key");
        ReflectionTestUtils.setField(validator, "s3SecretKey", "secret-key");
        ReflectionTestUtils.setField(validator, "s3BucketName", "kentiva-media");
        ReflectionTestUtils.setField(validator, "cacheType", "redis");
        ReflectionTestUtils.setField(validator, "redisUrl", "redis://default:secret@redis.internal:6379");
        ReflectionTestUtils.setField(validator, "redisHost", "");
        ReflectionTestUtils.setField(validator, "corsAllowedOrigins", "https://admin.kentiva.app,https://app.kentiva.app");
        ReflectionTestUtils.setField(validator, "corsAllowedOriginPatterns", "");
        ReflectionTestUtils.setField(validator, "geminiApiKey", "gemini-production-key");
        ReflectionTestUtils.setField(validator, "firebaseConfigBase64", "");
        ReflectionTestUtils.setField(validator, "smsProvider", "netgsm");
        ReflectionTestUtils.setField(validator, "netgsmUsercode", "netgsm-user");
        ReflectionTestUtils.setField(validator, "netgsmPassword", "netgsm-password");
        ReflectionTestUtils.setField(validator, "netgsmHeader", "KENTIVA");
        ReflectionTestUtils.setField(validator, "smsOtpDevBypassEnabled", false);
        ReflectionTestUtils.setField(validator, "mediaGuardFailOpen", false);
        ReflectionTestUtils.setField(validator, "mediaGuardBaseUrl", "http://media-guard.internal:8000");
        ReflectionTestUtils.setField(validator, "mediaValidationFailOpen", false);
        ReflectionTestUtils.setField(validator, "mediaAnonymizationFailOpen", false);
        ReflectionTestUtils.setField(validator, "requireDurableStorage", true);
        ReflectionTestUtils.setField(validator, "requireDistributedCache", true);
        ReflectionTestUtils.setField(validator, "requireDurableMessaging", true);
        ReflectionTestUtils.setField(validator, "rabbitMessagingEnabled", true);
        ReflectionTestUtils.setField(validator, "rabbitHost", "rabbit.internal");
        ReflectionTestUtils.setField(validator, "rabbitUsername", "kentiva");
        ReflectionTestUtils.setField(validator, "rabbitPassword", "rabbit-secret");
        ReflectionTestUtils.setField(validator, "rateLimitEnabled", true);
    }

    @Test
    void acceptsAProperlyConfiguredProductionEnvironment() {
        assertThatNoException().isThrownBy(() -> validator.validateRequiredSecrets());
    }

    @Test
    void rejectsInsecurePublicBaseUrl() {
        ReflectionTestUtils.setField(validator, "publicBaseUrl", "http://api.kentiva.app");

        assertThatIllegalStateException()
                .isThrownBy(() -> validator.validateRequiredSecrets())
                .withMessageContaining("APP_PUBLIC_URL");
    }

    @Test
    void rejectsLocalStorageWhenDurableStorageIsRequired() {
        ReflectionTestUtils.setField(validator, "storageType", "local");

        assertThatIllegalStateException()
                .isThrownBy(() -> validator.validateRequiredSecrets())
                .withMessageContaining("APP_STORAGE_TYPE=s3");
    }

    @Test
    void rejectsNonRedisCacheWhenDistributedCacheIsRequired() {
        ReflectionTestUtils.setField(validator, "cacheType", "none");

        assertThatIllegalStateException()
                .isThrownBy(() -> validator.validateRequiredSecrets())
                .withMessageContaining("APP_CACHE_TYPE=redis");
    }

    @Test
    void rejectsFailOpenMediaProtectionInProduction() {
        ReflectionTestUtils.setField(validator, "mediaValidationFailOpen", true);

        assertThatIllegalStateException()
                .isThrownBy(() -> validator.validateRequiredSecrets())
                .withMessageContaining("fail-open");
    }

    @Test
    void rejectsMissingMediaGuardUrlInProduction() {
        ReflectionTestUtils.setField(validator, "mediaGuardBaseUrl", "");

        assertThatIllegalStateException()
                .isThrownBy(() -> validator.validateRequiredSecrets())
                .withMessageContaining("MEDIA_GUARD_URL");
    }

    @Test
    void rejectsMissingGeminiKeyForFailClosedMediaProtection() {
        ReflectionTestUtils.setField(validator, "geminiApiKey", "");

        assertThatIllegalStateException()
                .isThrownBy(() -> validator.validateRequiredSecrets())
                .withMessageContaining("GEMINI_API_KEY");
    }

    @Test
    void rejectsDisabledSmsProviderInProduction() {
        ReflectionTestUtils.setField(validator, "smsProvider", "none");

        assertThatIllegalStateException()
                .isThrownBy(() -> validator.validateRequiredSecrets())
                .withMessageContaining("SMS_PROVIDER");
    }

    @Test
    void rejectsSmsOtpDevBypassInProduction() {
        ReflectionTestUtils.setField(validator, "smsOtpDevBypassEnabled", true);

        assertThatIllegalStateException()
                .isThrownBy(() -> validator.validateRequiredSecrets())
                .withMessageContaining("SMS_OTP_DEV_BYPASS_ENABLED");
    }

    @Test
    void rejectsDisabledRateLimitInProduction() {
        ReflectionTestUtils.setField(validator, "rateLimitEnabled", false);

        assertThatIllegalStateException()
                .isThrownBy(() -> validator.validateRequiredSecrets())
                .withMessageContaining("APP_SECURITY_RATE_LIMIT_ENABLED");
    }

    @Test
    void rejectsDisabledDurableMessagingInProduction() {
        ReflectionTestUtils.setField(validator, "rabbitMessagingEnabled", false);

        assertThatIllegalStateException()
                .isThrownBy(() -> validator.validateRequiredSecrets())
                .withMessageContaining("APP_MESSAGING_RABBIT_ENABLED");
    }
}
