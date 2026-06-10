package com.burak.belediyeapp.service.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

/**
 * KVKK açık rıza onaylarını kriptografik olarak imzalar (HMAC-SHA256).
 * İmza, kullanıcı veya ihbar bazlı canonical string üzerinden üretilir
 * ve sonradan doğrulanabilir (tamper-proof).
 */
@Service
@Slf4j
public class KvkkConsentSigningService {

    private static final String HMAC_ALGO = "HmacSHA256";

    @Value("${app.security.jwt.secret:}")
    private String jwtSecret;

    /**
     * Kullanıcı kayıt KVKK onayını imzalar.
     *
     * @param userId    kullanıcı UUID
     * @param email     kullanıcı e-posta
     * @param consentAt onay zamanı
     * @return HMAC-SHA256 hex imza veya boş string
     */
    public String signUserConsent(String userId, String email, LocalDateTime consentAt) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            return "";
        }
        String canonical = "KVKK_USER|" + userId + "|" + email + "|" + consentAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        return hmacHex(canonical);
    }

    /**
     * İhbar oluşturma KVKK onayını imzalar.
     *
     * @param reportId      ihbar UUID
     * @param reporterEmail ihbar sahibinin e-postası
     * @param consentAt     onay zamanı
     * @return HMAC-SHA256 hex imza veya boş string
     */
    public String signReportConsent(String reportId, String reporterEmail, LocalDateTime consentAt) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            return "";
        }
        String canonical = "KVKK_REPORT|" + reportId + "|" + reporterEmail + "|" + consentAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        return hmacHex(canonical);
    }

    private String hmacHex(String data) {
        try {
            SecretKeySpec keySpec = new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO);
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(keySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(rawHmac);
        } catch (Exception e) {
            log.warn("KVKK imza hesaplanamadı: {}", e.getMessage());
            return "";
        }
    }
}
