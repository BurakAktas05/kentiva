package com.burak.belediyeapp.service.ai;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.stream.Collectors;

/**
 * Google Gemini — öncelik, özet, kategori uyumu ve önerilen kategori.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    @Value("${app.ai.gemini.api-key:}")
    private String apiKey;

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    private final RestClient restClient = RestClient.builder()
            .requestFactory(requestFactory())
            .build();
    private final IReportCategoryRepository categoryRepository;

    public AIAnalysisResult analyzeReport(Report report) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. AI analizi atlanıyor.");
            return null;
        }

        String categoryOptions = categoryRepository.findAllByActiveTrue().stream()
                .map(c -> c.getName())
                .collect(Collectors.joining(", "));

        String prompt = String.format(
                """
                Sen Kentiva şehir bildirim platformunun analiz asistanısın. Aşağıdaki vatandaş bildirimini analiz et.
                Geçerli kategori adları (yalnızca bunlardan birini öner): [%s]
                Mevcut seçilen kategori: %s
                JSON döndür (İngilizce anahtarlar):
                {"priority":"LOW|MEDIUM|HIGH|CRITICAL","summary":"max 25 kelime Türkçe","is_category_correct":true/false,"suggested_category_name":"yalnızca listeden bir ad veya mevcut kategori","suggested_title":"kısa, etkili bir başlık (max 10 kelime)","sla_risk":"LOW|MEDIUM|HIGH","duplicate_hint":"mükerrer olasılığına dair kısa Türkçe not veya boş","reply_draft":"vatandaşa gönderilebilecek kısa resmi Türkçe cevap taslağı","priority_rationale":"öncelik gerekçesi, max 20 kelime Türkçe"}
                Başlık: %s
                Açıklama: %s
                """,
                categoryOptions,
                report.getCategory().getName(),
                report.getTitle(),
                report.getDescription()
        );

        String requestBody = new JSONObject()
                .put("contents", new JSONArray().put(
                        new JSONObject().put("parts", new JSONArray().put(
                                new JSONObject().put("text", prompt)
                        ))
                ))
                .put("generationConfig", new JSONObject().put("response_mime_type", "application/json"))
                .toString();

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String response = restClient.post()
                        .uri(GEMINI_API_URL + "?key=" + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                return parseResponse(response);
            } catch (Exception e) {
                // AI fail-soft çalışır: ihbar kaydı dış servis hatası yüzünden iptal edilmez.
                log.warn("AI analiz hatası (deneme {}): {}", attempt, e.getMessage());
            }
        }
        return null;
    }

    private AIAnalysisResult parseResponse(String response) {
        try {
            JSONObject json = new JSONObject(response);
            String text = json.getJSONArray("candidates")
                    .getJSONObject(0)
                    .getJSONObject("content")
                    .getJSONArray("parts")
                    .getJSONObject(0)
                    .getString("text");

            JSONObject analysis = new JSONObject(text);
            return new AIAnalysisResult(
                    analysis.optString("priority", "MEDIUM"),
                    analysis.optString("summary", ""),
                    analysis.optBoolean("is_category_correct", true),
                    analysis.optString("suggested_category_name", ""),
                    analysis.optString("suggested_title", ""),
                    analysis.optString("sla_risk", ""),
                    analysis.optString("reply_draft", ""),
                    analysis.optString("duplicate_hint", ""),
                    analysis.optString("priority_rationale", "")
            );
        } catch (Exception e) {
            log.error("AI yanıt ayrıştırma hatası: ", e);
            return null;
        }
    }

    public record AIAnalysisResult(
            String priority,
            String summary,
            boolean isCategoryCorrect,
            String suggestedCategoryName,
            String suggestedTitle,
            String slaRisk,
            String replyDraft,
            String duplicateHint,
            String priorityRationale
    ) {}

    private static SimpleClientHttpRequestFactory requestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(12_000);
        return factory;
    }
}
