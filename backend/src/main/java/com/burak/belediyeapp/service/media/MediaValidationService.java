package com.burak.belediyeapp.service.media;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Base64;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaValidationService {

    @Value("${app.ai.gemini.key-media-validation:${app.ai.gemini.api-key:}}")
    private String apiKey;

    @Value("${app.ai.gemini.model:gemini-2.5-flash}")
    private String model;

    private RestClient restClient = RestClient.builder()
            .requestFactory(requestFactory())
            .build();

    public record ValidationResult(boolean safe, String reason, String code) {}

    public ValidationResult validateImage(byte[] imageBytes, String contentType) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. Görsel güvenlik analizi atlanıyor.");
            return new ValidationResult(true, "API key not configured", "OK");
        }

        if (imageBytes == null || imageBytes.length == 0) {
            return new ValidationResult(true, "Empty image bytes", "OK");
        }

        String prompt = """
                Aşağıdaki görseli belediye ihbar sistemi güvenlik kuralları açısından analiz et.
                Bu görsel bir belediyeye vatandaşlar tarafından gönderilen sokak ihbarı (örn: çöp birikintisi, çukur, kırık park bankı) fotoğrafıdır.
                Görselin şu kurallara göre uygunluğunu denetle:
                1. Müstehcenlik/Çıplaklık (Nudity/Obscenity): Görselde çıplaklık, cinsel içerik veya aşırı müstehcenlik var mı?
                2. Şiddet/Vahşet (Violence/Gore): Görselde aşırı kan, şiddet, yaralanma, silah veya vahşet içerikleri var mı?
                3. Yasa Dışı/Zararlı (Illegal/Harmful): Görselde uyuşturucu, yasa dışı maddeler veya terör/nefret sembolleri var mı?
                
                Lütfen JSON formatında yanıt ver:
                {"safe": true/false, "reason": "Red gerekçesi Türkçe veya boş", "code": "OK | OBSCENITY | VIOLENCE | ILLEGAL"}
                """;

        try {
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);

            JSONObject inlineDataObj = new JSONObject()
                    .put("mimeType", contentType != null ? contentType : "image/jpeg")
                    .put("data", base64Image);

            JSONObject partText = new JSONObject().put("text", prompt);
            JSONObject partImage = new JSONObject().put("inlineData", inlineDataObj);

            String requestBody = new JSONObject()
                    .put("contents", new JSONArray().put(
                            new JSONObject().put("parts", new JSONArray().put(partText).put(partImage))
                    ))
                    .put("generationConfig", new JSONObject().put("response_mime_type", "application/json"))
                    .toString();

            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

            String response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JSONObject json = new JSONObject(response);
            
            if (json.has("promptFeedback")) {
                JSONObject feedback = json.getJSONObject("promptFeedback");
                if (feedback.has("blockReason") && !"NONE".equalsIgnoreCase(feedback.getString("blockReason"))) {
                    log.warn("Gemini API promptFeedback engeli tetiklendi: {}", feedback.getString("blockReason"));
                    return new ValidationResult(false, "Görsel güvenlik kuralları ihlali (Prompt blocked).", "SAFETY");
                }
            }

            if (!json.has("candidates") || json.getJSONArray("candidates").length() == 0) {
                log.warn("Gemini API candidates boş döndü (Güvenlik engeli tetiklenmiş olabilir).");
                return new ValidationResult(false, "Müstehcenlik, şiddet veya yasa dışı içerik tespit edildi.", "SAFETY");
            }

            JSONObject candidate = json.getJSONArray("candidates").getJSONObject(0);
            if (candidate.has("finishReason") && "SAFETY".equalsIgnoreCase(candidate.getString("finishReason"))) {
                log.warn("Gemini analiz finishReason SAFETY olarak belirlendi.");
                return new ValidationResult(false, "Görsel güvenlik kuralları ihlali (Safety finish reason).", "SAFETY");
            }

            if (!candidate.has("content") || !candidate.getJSONObject("content").has("parts") ||
                    candidate.getJSONObject("content").getJSONArray("parts").length() == 0) {
                log.warn("Gemini API candidate content veya parts boş döndü.");
                return new ValidationResult(false, "Görsel güvenlik kuralları ihlali.", "SAFETY");
            }

            String text = candidate
                    .getJSONObject("content")
                    .getJSONArray("parts")
                    .getJSONObject(0)
                    .getString("text")
                    .trim();

            if (text.startsWith("```")) {
                text = text.replaceAll("```json|```", "").trim();
            }

            JSONObject analysis = new JSONObject(text);
            return new ValidationResult(
                    analysis.optBoolean("safe", true),
                    analysis.optString("reason", ""),
                    analysis.optString("code", "OK")
            );
        } catch (Exception e) {
            log.error("Gemini görsel güvenlik analizi başarısız oldu (fail-open): {}", e.getMessage());
            return new ValidationResult(true, "Validation failed: " + e.getMessage(), "OK");
        }
    }

    private static SimpleClientHttpRequestFactory requestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(30_000);
        return factory;
    }
}
