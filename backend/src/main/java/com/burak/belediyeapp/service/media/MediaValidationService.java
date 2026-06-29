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

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaValidationService {

    @Value("${app.ai.gemini.key-media-validation:${app.ai.gemini.api-key:}}")
    private String apiKey;

    @Value("${app.ai.gemini.model:gemini-2.5-flash}")
    private String model;

    @Value("${app.media-validation.fail-open:true}")
    private boolean failOpen;

    private RestClient restClient = RestClient.builder()
            .requestFactory(requestFactory())
            .build();

    public record ValidationResult(boolean safe, String reason, String code) {}

    public ValidationResult validateImage(byte[] imageBytes, String contentType) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API key eksik. Gorsel guvenlik analizi atlanıyor.");
            return unavailableResult("API key not configured");
        }

        if (imageBytes == null || imageBytes.length == 0) {
            return new ValidationResult(true, "Empty image bytes", "OK");
        }

        String prompt = """
                Asagidaki gorseli belediye ihbar sistemi guvenlik kurallari acisindan analiz et.
                Bu gorsel bir belediyeye vatandaslar tarafindan gonderilen sokak ihbari fotografidir.
                Gorselin su kurallara gore uygunlugunu denetle:
                1. Mustehcenlik/Ciplaklik
                2. Siddet/Vahset
                3. Yasa Disi/Zararli

                Lutfen JSON formatinda yanit ver:
                {"safe": true/false, "reason": "Red gerekcesi Turkce veya bos", "code": "OK | OBSCENITY | VIOLENCE | ILLEGAL"}
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
                    log.warn("Gemini promptFeedback engeli tetiklendi: {}", feedback.getString("blockReason"));
                    return new ValidationResult(false, "Gorsel guvenlik kurallari ihlali.", "SAFETY");
                }
            }

            if (!json.has("candidates") || json.getJSONArray("candidates").length() == 0) {
                log.warn("Gemini candidates bos dondu.");
                return new ValidationResult(false, "Gorsel guvenlik kurallari ihlali.", "SAFETY");
            }

            JSONObject candidate = json.getJSONArray("candidates").getJSONObject(0);
            if (candidate.has("finishReason") && "SAFETY".equalsIgnoreCase(candidate.getString("finishReason"))) {
                log.warn("Gemini analiz finishReason SAFETY olarak dondu.");
                return new ValidationResult(false, "Gorsel guvenlik kurallari ihlali.", "SAFETY");
            }

            if (!candidate.has("content")
                    || !candidate.getJSONObject("content").has("parts")
                    || candidate.getJSONObject("content").getJSONArray("parts").length() == 0) {
                log.warn("Gemini candidate content/parts bos dondu.");
                return new ValidationResult(false, "Gorsel guvenlik kurallari ihlali.", "SAFETY");
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
            log.error("Gemini gorsel guvenlik analizi basarisiz oldu: {}", e.getMessage());
            return unavailableResult("Validation failed: " + e.getMessage());
        }
    }

    private ValidationResult unavailableResult(String reason) {
        if (failOpen) {
            return new ValidationResult(true, reason, "OK");
        }
        return new ValidationResult(false, reason, "UNAVAILABLE");
    }

    private static SimpleClientHttpRequestFactory requestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(30_000);
        return factory;
    }
}
