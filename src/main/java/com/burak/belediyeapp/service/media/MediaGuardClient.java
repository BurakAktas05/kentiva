package com.burak.belediyeapp.service.media;

import com.burak.belediyeapp.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

/**
 * Opsiyonel Python media-guard servisi ({@code /scan}) ile yüz/selfie sezgisi.
 * {@code app.media-guard.base-url} boşsa doğrulama atlanır.
 */
@Service
@Slf4j
public class MediaGuardClient {

    @Value("${app.media-guard.base-url:}")
    private String baseUrl;

    @Value("${app.media-guard.fail-open:true}")
    private boolean failOpen;

    private final RestClient http = RestClient.builder()
            .requestFactory(requestFactory())
            .build();

    public void validateImageOrThrow(byte[] body, String contentType) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return;
        }
        String url = baseUrl.replaceAll("/$", "") + "/scan";
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String json = http.post()
                        .uri(url)
                        .contentType(MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"))
                        .body(body)
                        .retrieve()
                        .body(String.class);

                JSONObject o = new JSONObject(json != null ? json : "{}");
                if (o.optBoolean("reject", false)) {
                    throw new BusinessException(
                            o.optString("reason", "Fotoğraf kurallara uygun değil (ör. yüz/selfie tespiti)."),
                            "MEDIA_REJECTED");
                }
                return;
            } catch (BusinessException e) {
                throw e;
            } catch (Exception e) {
                log.warn("Media guard çağrısı başarısız (deneme {}): {}", attempt, e.getMessage());
                if (attempt == 2 && !failOpen) {
                    throw new BusinessException("Medya doğrulama servisine ulaşılamadı.", "MEDIA_GUARD_UNAVAILABLE");
                }
            }
        }
    }

    private static SimpleClientHttpRequestFactory requestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(10_000);
        return factory;
    }
}
