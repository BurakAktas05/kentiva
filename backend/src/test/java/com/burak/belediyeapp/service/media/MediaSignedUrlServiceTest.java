package com.burak.belediyeapp.service.media;

import com.burak.belediyeapp.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MediaSignedUrlServiceTest {

    private final MediaSignedUrlService service = new MediaSignedUrlService();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "signingSecret", "dGhpcyBpcyBhIHRlc3Qgc2VjcmV0IGtleSB0aGF0IGlzIGxvbmcgZW5vdWdo");
        ReflectionTestUtils.setField(service, "expirationMinutes", 60L);
        ReflectionTestUtils.setField(service, "publicBaseUrl", "http://localhost:8080");
        ReflectionTestUtils.setField(service, "storageType", "local");
        ReflectionTestUtils.setField(service, "s3PublicUrl", "");
    }

    @Test
    void signAndVerifyRoundTripForStorageKey() {
        String signed = service.signForClient("reports/abc_photo.jpg");
        assertThat(signed).contains("/api/v1/media/access?token=");

        String token = signed.substring(signed.indexOf("token=") + "token=".length());
        String path = service.verifyAndExtractPath(token);
        assertThat(path).isEqualTo("reports/abc_photo.jpg");
    }

    @Test
    void persistableStoragePathExtractsFromLegacyUploadsUrl() {
        String key = service.persistableStoragePath("http://localhost:8080/uploads/reports/x.jpg");
        assertThat(key).isEqualTo("reports/x.jpg");
    }

    @Test
    void persistableStoragePathExtractsFromSignedAccessUrl() {
        String signed = service.signForClient("reports/y.jpg");
        String key = service.persistableStoragePath(signed);
        assertThat(key).isEqualTo("reports/y.jpg");
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = service.createToken("reports/z.jpg");
        String tampered = token.substring(0, token.length() - 4) + "XXXX";
        assertThatThrownBy(() -> service.verifyAndExtractPath(tampered))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void guessContentTypeForJpeg() {
        assertThat(service.guessContentType("reports/a.jpeg")).isEqualTo("image/jpeg");
    }
}
