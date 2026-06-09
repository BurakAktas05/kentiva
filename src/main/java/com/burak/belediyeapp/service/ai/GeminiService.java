package com.burak.belediyeapp.service.ai;

import com.burak.belediyeapp.dto.request.municipality.GenerateNotificationTemplateRequest.NotificationTemplateKind;
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

    @Value("${app.ai.gemini.model:gemini-2.5-flash}")
    private String model;

    private String geminiGenerateContentUrl() {
        return "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
    }

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

        String lang = report.getContentLanguage() != null && !report.getContentLanguage().isBlank()
                ? report.getContentLanguage()
                : ContentLanguageDetector.detect(report.getTitle(), report.getDescription());
        String replyLanguage = switch (lang.toLowerCase()) {
            case "en" -> "English";
            case "ar" -> "Arabic";
            default -> "Turkish";
        };

        String prompt = String.format(
                """
                Sen Kentiva şehir bildirim platformunun analiz asistanısın. Aşağıdaki vatandaş bildirimini analiz et.
                Geçerli kategori adları (yalnızca bunlardan birini öner): [%s]
                Mevcut seçilen kategori: %s
                Rapor içerik dili: %s
                JSON döndür (İngilizce anahtarlar):
                {"priority":"LOW|MEDIUM|HIGH|CRITICAL","summary":"max 25 kelime, staff için Türkçe","is_category_correct":true/false,"suggested_category_name":"yalnızca listeden bir ad veya mevcut kategori","suggested_title":"kısa başlık (rapor diliyle uyumlu, max 10 kelime)","sla_risk":"LOW|MEDIUM|HIGH","duplicate_hint":"mükerrer notu Türkçe veya boş","reply_draft":"vatandaşa gönderilecek kısa resmi yanıt — mutlaka %s dilinde","priority_rationale":"öncelik gerekçesi Türkçe, max 20 kelime"}
                Başlık: %s
                Açıklama: %s
                """,
                categoryOptions,
                report.getCategory().getName(),
                lang,
                replyLanguage,
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
                        .uri(geminiGenerateContentUrl() + "?key=" + apiKey)
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

    /**
     * Belediye SMS / push şablonu metni üretir (Türkçe, yer tutucularla).
     */
    public String generateNotificationTemplate(
            String municipalityDisplayName,
            String slogan,
            NotificationTemplateKind kind) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. Şablon AI atlanıyor.");
            return null;
        }
        String belediye = municipalityDisplayName != null && !municipalityDisplayName.isBlank()
                ? municipalityDisplayName : "Belediyemiz";
        String prompt = buildNotificationTemplatePrompt(kind, belediye, slogan);

        String requestBody = new JSONObject()
                .put("contents", new JSONArray().put(
                        new JSONObject().put("parts", new JSONArray().put(
                                new JSONObject().put("text", prompt)
                        ))
                ))
                .toString();

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String response = restClient.post()
                        .uri(geminiGenerateContentUrl() + "?key=" + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);
                return extractPlainText(response);
            } catch (Exception e) {
                log.warn("Şablon AI hatası (deneme {}): {}", attempt, e.getMessage());
            }
        }
        return null;
    }

    private static String buildNotificationTemplatePrompt(
            NotificationTemplateKind kind,
            String belediye,
            String slogan) {
        String placeholders = "Kullanılabilir yer tutucular: {belediye}, {baslik}, {not}, {slogan}";
        String base = "Sen Türkiye'deki bir belediyenin vatandaş bildirim platformu metin yazarısın. "
                + "Yalnızca istenen metni yaz; açıklama veya tırnak ekleme. " + placeholders + ". ";
        return switch (kind) {
            case SMS_RESOLVED -> base + "Çözülen ihbar için kısa, resmi bir SMS (en fazla 155 karakter). Belediye: "
                    + belediye + (slogan != null && !slogan.isBlank() ? ", slogan: " + slogan : "") + ".";
            case SMS_PROCESSING -> base + "İhbar işleme alındı SMS (en fazla 155 karakter). Belediye: " + belediye + ".";
            case SMS_ASSIGNED -> base + "Saha görevlisine atanan ihbar için SMS (en fazla 155 karakter). Belediye: "
                    + belediye + ".";
            case PUSH_REJECTED_TITLE -> base + "Reddedilen ihbar için mobil push başlığı (en fazla 50 karakter).";
            case PUSH_REJECTED_BODY -> base + "Reddedilen ihbar push mesajı (en fazla 120 karakter).";
            case PUSH_PROCESSING_TITLE -> base + "İşlemde ihbar push başlığı (en fazla 50 karakter).";
            case PUSH_PROCESSING_BODY -> base + "İşlemde ihbar push mesajı (en fazla 120 karakter).";
            case PUSH_ASSIGNED_TITLE -> base + "Atanan ihbar push başlığı (en fazla 50 karakter).";
            case PUSH_ASSIGNED_BODY -> base + "Atanan ihbar push mesajı (en fazla 120 karakter).";
        };
    }

    private String extractPlainText(String response) {
        try {
            JSONObject json = new JSONObject(response);
            return json.getJSONArray("candidates")
                    .getJSONObject(0)
                    .getJSONObject("content")
                    .getJSONArray("parts")
                    .getJSONObject(0)
                    .getString("text")
                    .trim();
        } catch (Exception e) {
            log.error("Şablon AI yanıt ayrıştırma hatası: ", e);
            return null;
        }
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

    public String parseBusRoutes(String combinedText) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. AI ile otobüs hatları ayrıştırma atlanıyor. Boş veri döndürülüyor.");
            return "[]";
        }

        String prompt = String.format(
                """
                Sen Kentiva belediye ulaşım asistanısın. Sana verilen metinler, bir belediyenin otobüs hatları, durakları ve kalkış saatleri bilgilerini içerir.
                Bu metinlerden otobüs hatlarını (bus routes) analiz et ve aşağıdaki JSON şemasına uygun bir JSON dizisi oluştur.
                
                Her hat (route) için:
                - code: Kısa hat kodu (örn: "Şİ", "SK", "100-A", "KYK")
                - name: Hat adı (örn: "Şehir İçi Hattı", "Safranbolu - Karabük")
                - color: Hat için görsel bir hex rengi (örn: "#10B981", "#3B82F6", "#F59E0B"). Renkler uyumlu ve canlı olmalıdır.
                - icon: 'bus' veya 'graduation-cap' veya 'home' değerlerinden biri (hattın amacına göre seç, varsayılan 'bus')
                - stops: Durakların sıralı listesi (başlangıç durağından bitiş durağına doğru sıralı dizin, örn: ["Durak A", "Durak B", "Durak C"])
                - schedule: Kalkış saatleri. "weekday" (hafta içi) mutlaka dolu olmalıdır. "weekend", "saturday", "sunday" alanları isteğe bağlıdır. Her biri departuresFromStart (başlangıç durağından kalkış saatleri örn: ["07:00", "07:30"]) ve departuresFromEnd (bitiş durağından kalkış saatleri örn: ["07:30", "08:00"]) içermelidir.
                
                JSON formatı kesinlikle şu şekilde olmalıdır (Başka hiçbir açıklama, markdown bloğu veya metin ekleme, yalnızca geçerli JSON döndür):
                [
                  {
                    "code": "Şİ",
                    "name": "Şehir İçi Hattı",
                    "color": "#10B981",
                    "icon": "bus",
                    "stops": ["Kıranköy", "Sadri Artunç Caddesi", "Eski Çarşı"],
                    "schedule": {
                      "weekday": {
                        "departuresFromStart": ["07:00", "08:00"],
                        "departuresFromEnd": ["07:30", "08:30"]
                      },
                      "weekend": {
                        "departuresFromStart": ["09:00", "10:00"],
                        "departuresFromEnd": ["09:30", "10:30"]
                      }
                    }
                  }
                ]
                
                Analiz edilecek veriler:
                %s
                """,
                combinedText
        );

        String requestBody = new JSONObject()
                .put("contents", new JSONArray().put(
                        new JSONObject().put("parts", new JSONArray().put(
                                new JSONObject().put("text", prompt)
                        ))
                ))
                .put("generationConfig", new JSONObject().put("response_mime_type", "application/json"))
                .toString();

        try {
            String response = restClient.post()
                    .uri(geminiGenerateContentUrl() + "?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JSONObject json = new JSONObject(response);
            String text = json.getJSONArray("candidates")
                    .getJSONObject(0)
                    .getJSONObject("content")
                    .getJSONArray("parts")
                    .getJSONObject(0)
                    .getString("text")
                    .trim();

            if (text.startsWith("```")) {
                text = text.replaceAll("```json|```", "").trim();
            }
            return text;
        } catch (Exception e) {
            log.error("Gemini otobüs hatları ayrıştırma hatası: ", e);
            return "[]";
        }
    }

    public java.util.List<String> findDuplicateReports(Report newReport, java.util.List<Report> nearbyReports) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. Semantik duplicate analizi atlanıyor.");
            return null;
        }
        if (nearbyReports == null || nearbyReports.isEmpty()) {
            return java.util.List.of();
        }

        // Build prompt
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("Yeni bir ihbar kaydı oluşturuldu. Bu yeni ihbarın bilgileri şöyledir:\n");
        promptBuilder.append("ID: ").append(newReport.getId()).append("\n");
        promptBuilder.append("Başlık: ").append(newReport.getTitle()).append("\n");
        promptBuilder.append("Açıklama: ").append(newReport.getDescription()).append("\n");
        if (newReport.getCategory() != null) {
            promptBuilder.append("Kategori: ").append(newReport.getCategory().getName()).append("\n");
        }
        promptBuilder.append("\nKonum olarak bu yeni ihbarın yakınında bulunan aktif ihbarların listesi:\n");
        for (int i = 0; i < nearbyReports.size(); i++) {
            Report r = nearbyReports.get(i);
            promptBuilder.append(i + 1).append(". İhbar:\n");
            promptBuilder.append("  ID: ").append(r.getId()).append("\n");
            promptBuilder.append("  Başlık: ").append(r.getTitle()).append("\n");
            promptBuilder.append("  Açıklama: ").append(r.getDescription()).append("\n");
            if (r.getCategory() != null) {
                promptBuilder.append("  Kategori: ").append(r.getCategory().getName()).append("\n");
            }
            promptBuilder.append("\n");
        }
        promptBuilder.append("Soru: Yakındaki ihbarlardan hangileri bu yeni ihbar ile aynı fiziksel problemi (örneğin aynı çukuru, aynı sönmüş sokak lambasını, aynı çöp yığınını) bildirmektedir? Lütfen sadece kesin olarak aynı probleme ait olan ihbarları seçin.\n");
        promptBuilder.append("Yanıtınızı kesinlikle sadece JSON formatında, aynı probleme ait olan ihbarların ID'lerini içeren bir dizi olarak dönün. Örneğin: [\"id1\", \"id2\"]. Eğer hiçbiri aynı probleme ait değilse boş bir dizi dönün: []. Başka hiçbir açıklama, markdown veya metin eklemeyin.");

        String prompt = promptBuilder.toString();

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
                        .uri(geminiGenerateContentUrl() + "?key=" + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                JSONObject json = new JSONObject(response);
                String text = json.getJSONArray("candidates")
                        .getJSONObject(0)
                        .getJSONObject("content")
                        .getJSONArray("parts")
                        .getJSONObject(0)
                        .getString("text")
                        .trim();

                if (text.startsWith("```")) {
                    text = text.replaceAll("```json|```", "").trim();
                }

                JSONArray array = new JSONArray(text);
                java.util.List<String> duplicateIds = new java.util.ArrayList<>();
                for (int i = 0; i < array.length(); i++) {
                    duplicateIds.add(array.getString(i));
                }
                return duplicateIds;
            } catch (Exception e) {
                log.warn("Gemini duplicate analizi hatası (deneme {}): {}", attempt, e.getMessage());
            }
        }
        return null;
    }

    public java.util.List<String> selectBestResolvedReports(java.util.List<Report> resolvedReports) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. Örnek rapor seçimi atlanıyor.");
            return null;
        }
        if (resolvedReports == null || resolvedReports.isEmpty()) {
            return java.util.List.of();
        }

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("Aşağıda bir belediyeye ait çözülen vatandaş ihbarlarının listesi verilmiştir. ")
                .append("Bu ihbarlardan, belediyenin başarısını/hizmet kalitesini halka en iyi gösteren ve kamu yararı taşıyan ")
                .append("(örneğin yol onarımı, park temizliği, aydınlatma tamiri gibi olumlu sonuçlar barındıran) en iyi 3 tanesini seç.\n\n");

        for (int i = 0; i < resolvedReports.size(); i++) {
            Report r = resolvedReports.get(i);
            promptBuilder.append("İhbar ").append(i + 1).append(":\n");
            promptBuilder.append("  ID: ").append(r.getId()).append("\n");
            promptBuilder.append("  Başlık: ").append(r.getTitle()).append("\n");
            promptBuilder.append("  Açıklama: ").append(r.getDescription()).append("\n");
            promptBuilder.append("  Kategori: ").append(r.getCategory() != null ? r.getCategory().getName() : "Genel").append("\n\n");
        }

        promptBuilder.append("Kesinlikle sadece seçtiğin en fazla 3 ihbarın ID'sini içeren bir JSON dizi formatında yanıt dön. ")
                .append("Örneğin: [\"id1\", \"id2\"]. Başka hiçbir kelime, açıklama veya markdown biçimlendirmesi ekleme.");

        String prompt = promptBuilder.toString();

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
                        .uri(geminiGenerateContentUrl() + "?key=" + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                JSONObject json = new JSONObject(response);
                String text = json.getJSONArray("candidates")
                        .getJSONObject(0)
                        .getJSONObject("content")
                        .getJSONArray("parts")
                        .getJSONObject(0)
                        .getString("text")
                        .trim();

                if (text.startsWith("```")) {
                    text = text.replaceAll("```json|```", "").trim();
                }

                JSONArray array = new JSONArray(text);
                java.util.List<String> selectedIds = new java.util.ArrayList<>();
                for (int i = 0; i < array.length(); i++) {
                    selectedIds.add(array.getString(i));
                }
                return selectedIds;
            } catch (Exception e) {
                log.warn("Gemini örnek rapor seçimi hatası (deneme {}): {}", attempt, e.getMessage());
            }
        }
        return null;
    }

    private static SimpleClientHttpRequestFactory requestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(30_000);
        return factory;
    }
}
