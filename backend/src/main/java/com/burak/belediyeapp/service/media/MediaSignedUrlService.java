package com.burak.belediyeapp.service.media;

import com.burak.belediyeapp.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Yerel medya için süre sınırlı imzalı erişim URL'leri; S3/R2 için önceden imzalı GET URL üretir.
 */
@Service
@Slf4j
public class MediaSignedUrlService {

    private static final Pattern UPLOADS_PATH = Pattern.compile("/uploads/(.+)$");
    private static final String ACCESS_PATH = "/api/v1/media/access?token=";

    @Value("${app.security.jwt.secret:}")
    private String signingSecret;

    @Value("${app.media.signed-url-expiration-minutes:120}")
    private long expirationMinutes;

    @Value("${app.public-base-url:}")
    private String publicBaseUrl;

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${app.storage.s3.bucket-name:belediye-reports}")
    private String bucketName;

    @Value("${app.storage.s3.public-url:}")
    private String s3PublicUrl;

    @Autowired(required = false)
    private S3Presigner s3Presigner;

    public List<String> signAll(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return urls;
        }
        return urls.stream().map(this::signForClient).toList();
    }

    /**
     * API yanıtı veya yükleme sonrası istemciye verilecek erişim URL'si.
     */
    public String signForClient(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) {
            return storedValue;
        }
        if (storedValue.contains(ACCESS_PATH)) {
            return storedValue;
        }
        if (isS3Mode()) {
            String key = resolveStorageKey(storedValue);
            if (key != null) {
                return createS3PresignedUrl(key);
            }
        }
        String relative = resolveStorageKey(storedValue);
        if (relative == null) {
            return storedValue;
        }
        return buildAccessUrl(createToken(relative));
    }

    /** Eski ad — geriye dönük uyumluluk. */
    public String signIfLocal(String url) {
        return signForClient(url);
    }

    /**
     * Veritabanına yazılacak göreli depolama anahtarı ({@code reports/dosya.jpg}).
     */
    public String persistableStoragePath(String urlOrKey) {
        if (urlOrKey == null || urlOrKey.isBlank()) {
            throw new BusinessException("Medya URL boş olamaz.", "INVALID_MEDIA_URL");
        }
        String trimmed = urlOrKey.trim();
        if (trimmed.contains(ACCESS_PATH)) {
            int idx = trimmed.indexOf("token=");
            if (idx >= 0) {
                String token = trimmed.substring(idx + "token=".length());
                int amp = token.indexOf('&');
                if (amp >= 0) {
                    token = token.substring(0, amp);
                }
                // DB'ye yazarken süre dolmuş olsa da imza geçerliyse depolama yolunu çıkar
                // (istemci formda imzalı URL tutar; erişim GET'inde süre hâlâ zorunlu).
                return verifyAndExtractPath(token, false);
            }
        }
        String key = resolveStorageKey(trimmed);
        if (key != null) {
            return key;
        }
        // SSRF Koruması: Dış HTTP/HTTPS kaynaklı URL'leri engelle
        String lower = trimmed.toLowerCase();
        if (lower.startsWith("http://") || lower.startsWith("https://")) {
            throw new BusinessException("Medya dosyası geçersiz veya güvenilmeyen bir kaynaktan geliyor.", "INVALID_MEDIA_URL");
        }
        return normalizePath(trimmed);
    }

    public String createToken(String storageRelativePath) {
        String normalized = normalizePath(storageRelativePath);
        long expiresAt = Instant.now().getEpochSecond() + expirationMinutes * 60L;
        String payload = normalized + "|" + expiresAt;
        String signature = hmac(payload);
        String raw = payload + "|" + signature;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    public String verifyAndExtractPath(String token) {
        return verifyAndExtractPath(token, true);
    }

    /**
     * @param requireNotExpired {@code true} ise erişim için süre kontrolü yapılır;
     *                          {@code false} ise yalnızca imza doğrulanır (kalıcı yol çıkarma).
     */
    public String verifyAndExtractPath(String token, boolean requireNotExpired) {
        if (token == null || token.isBlank()) {
            throw new BusinessException("Geçersiz medya erişim anahtarı.", "INVALID_MEDIA_TOKEN");
        }
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|");
            if (parts.length != 3) {
                throw new BusinessException("Geçersiz medya erişim anahtarı.", "INVALID_MEDIA_TOKEN");
            }
            String path = parts[0];
            long expiresAt = Long.parseLong(parts[1]);
            String signature = parts[2];
            if (requireNotExpired && Instant.now().getEpochSecond() > expiresAt) {
                throw new BusinessException("Medya bağlantısının süresi doldu.", "MEDIA_TOKEN_EXPIRED");
            }
            String expected = hmac(path + "|" + expiresAt);
            if (!MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    signature.getBytes(StandardCharsets.UTF_8))) {
                throw new BusinessException("Geçersiz medya erişim anahtarı.", "INVALID_MEDIA_TOKEN");
            }
            return path;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Medya token doğrulama hatası: {}", e.getMessage());
            throw new BusinessException("Geçersiz medya erişim anahtarı.", "INVALID_MEDIA_TOKEN");
        }
    }

    public String guessContentType(String storageKey) {
        String lower = storageKey.toLowerCase();
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".gif")) {
            return "image/gif";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        return "application/octet-stream";
    }

    public boolean isS3Mode() {
        return "s3".equalsIgnoreCase(storageType) && s3Presigner != null;
    }

    private String resolveStorageKey(String url) {
        String trimmed = url.trim();
        Matcher m = UPLOADS_PATH.matcher(url);
        if (m.find()) {
            return normalizePath(m.group(1));
        }
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            try {
                URI uri = URI.create(trimmed);
                String path = uri.getPath();
                if (path != null) {
                    Matcher uploadsInPath = UPLOADS_PATH.matcher(path);
                    if (uploadsInPath.find()) {
                        return normalizePath(uploadsInPath.group(1));
                    }
                    String s3Base = s3PublicUrl == null ? "" : s3PublicUrl.replaceAll("/+$", "");
                    if (!s3Base.isBlank() && trimmed.startsWith(s3Base + "/")) {
                        return normalizePath(trimmed.substring(s3Base.length() + 1));
                    }
                }
            } catch (BusinessException e) {
                throw e;
            } catch (Exception ignored) {
                // fall through
            }
            return null;
        }
        if (!trimmed.contains("://") && !trimmed.contains(ACCESS_PATH) && trimmed.contains("/")) {
            return normalizePath(trimmed);
        }
        return null;
    }

    private String createS3PresignedUrl(String storageKey) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(storageKey)
                .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expirationMinutes))
                .getObjectRequest(getObjectRequest)
                .build();
        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
        return presigned.url().toString();
    }

    private String buildAccessUrl(String token) {
        String path = ACCESS_PATH + token;
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            return path;
        }
        return publicBaseUrl.trim().replaceAll("/+$", "") + path;
    }

    private static String normalizePath(String path) {
        String p = path.replace('\\', '/').trim();
        while (p.startsWith("/")) {
            p = p.substring(1);
        }
        if (p.startsWith("uploads/")) {
            p = p.substring("uploads/".length());
        }
        if (p.contains("..")) {
            throw new BusinessException("Geçersiz dosya yolu.", "INVALID_MEDIA_PATH");
        }
        return p;
    }

    private String hmac(String payload) {
        if (signingSecret == null || signingSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET tanımlanmalıdır (medya imzası için).");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Medya imzalama başarısız", e);
        }
    }
}
