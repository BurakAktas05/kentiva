package com.burak.belediyeapp.service.ai;

import com.burak.belediyeapp.dto.request.municipality.GenerateNotificationTemplateRequest.NotificationTemplateKind;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.entity.SystemFeedback;
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
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.ArrayList;
import java.util.Base64;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;

/**
 * Google Gemini — öncelik, özet, kategori uyumu ve önerilen kategori.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    @Value("${app.ai.gemini.api-key:}")
    private String apiKey;

    @Value("${app.ai.gemini.key-report-analysis:${app.ai.gemini.api-key:}}")
    private String keyReportAnalysis;

    @Value("${app.ai.gemini.key-notification-template:${app.ai.gemini.api-key:}}")
    private String keyNotificationTemplate;

    @Value("${app.ai.gemini.key-bus-transit:${app.ai.gemini.api-key:}}")
    private String keyBusTransit;

    @Value("${app.ai.gemini.key-duplicate-detection:${app.ai.gemini.api-key:}}")
    private String keyDuplicateDetection;

    @Value("${app.ai.gemini.key-resolved-reports:${app.ai.gemini.api-key:}}")
    private String keyResolvedReports;

    @Value("${app.ai.gemini.key-feedback-analysis:${app.ai.gemini.api-key:}}")
    private String keyFeedbackAnalysis;

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
        return analyzeReport(report, null);
    }

    public AIAnalysisResult analyzeReport(Report report, ReportStatus targetStatus) {
        String activeKey = keyReportAnalysis != null && !keyReportAnalysis.isBlank() ? keyReportAnalysis : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
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

        String replyDraftInstruction;
        if (targetStatus == ReportStatus.OUT_OF_JURISDICTION) {
            replyDraftInstruction = "vatandaşa gönderilecek, konunun belediyenin yetki/görev alanı dışında kaldığını (örneğin karayolları genel müdürlüğü, elektrik dağıtım şirketi vb. kurumlara ait olduğunu) belirten, durumu kibarca açıklayan resmi bir bilgilendirme yanıtı — mutlaka %s dilinde";
        } else if (targetStatus == ReportStatus.RESOLVED) {
            replyDraftInstruction = "vatandaşa gönderilecek, bildirilen sorunun saha ekiplerimiz tarafından başarıyla çözümlendiğini ve giderildiğini bildiren resmi bir teşekkür ve bilgilendirme yanıtı — mutlaka %s dilinde";
        } else if (targetStatus == ReportStatus.PROCESSING) {
            replyDraftInstruction = "vatandaşa gönderilecek, bildirimin incelenip işleme alındığını ve saha ekiplerinin çalışmaya başladığını bildiren resmi ve kısa bir bilgilendirme yanıtı — mutlaka %s dilinde";
        } else if (targetStatus == ReportStatus.REJECTED) {
            replyDraftInstruction = "vatandaşa gönderilecek, bildirimin kurallarımıza uymaması veya yetersiz bilgi içermesi sebebiyle reddedildiğini bildiren, durumu kibarca açıklayan resmi bir bilgilendirme yanıtı — mutlaka %s dilinde";
        } else {
            replyDraftInstruction = "vatandaşa gönderilecek kısa resmi yanıt — mutlaka %s dilinde";
        }

        String prompt = String.format(
                """
                Sen Kentiva şehir bildirim platformunun analiz asistanısın. Aşağıdaki vatandaş bildirimini analiz et.
                Geçerli kategori adları (yalnızca bunlardan birini öner): [%s]
                Mevcut seçilen kategori: %s
                Rapor içerik dili: %s
                JSON döndür (İngilizce anahtarlar):
                {"priority":"LOW|MEDIUM|HIGH|CRITICAL","summary":"max 25 kelime, staff için Türkçe","is_category_correct":true/false,"suggested_category_name":"yalnızca listeden bir ad veya mevcut kategori","suggested_title":"kısa başlık (rapor diliyle uyumlu, max 10 kelime)","sla_risk":"LOW|MEDIUM|HIGH","duplicate_hint":"mükerrer notu Türkçe veya boş","reply_draft":"%s","priority_rationale":"öncelik gerekçesi Türkçe, max 20 kelime"}
                Başlık: %s
                Açıklama: %s
                """,
                categoryOptions,
                report.getCategory().getName(),
                lang,
                String.format(replyDraftInstruction, replyLanguage),
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
                        .uri(geminiGenerateContentUrl() + "?key=" + activeKey)
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
        String activeKey = keyNotificationTemplate != null && !keyNotificationTemplate.isBlank() ? keyNotificationTemplate : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
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
                        .uri(geminiGenerateContentUrl() + "?key=" + activeKey)
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

    private String executeGeminiCall(String requestBody) {
        return executeGeminiCall(requestBody, apiKey);
    }

    private String executeGeminiCall(String requestBody, String activeKey) {
        String response = restClient.post()
                .uri(geminiGenerateContentUrl() + "?key=" + activeKey)
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
    }

    public String parseBusRoutes(String combinedText) {
        String activeKey = keyBusTransit != null && !keyBusTransit.isBlank() ? keyBusTransit : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. AI ile otobüs hatları ayrıştırma atlanıyor. Boş veri döndürülüyor.");
            return "[]";
        }

        String prompt = String.format(
                """
                Sen Kentiva belediye ulaşım asistanısın. Sana verilen metinler, bir belediyenin otobüs hatları, durakları ve kalkış saatleri bilgilerini içerir.
                Metinlerdeki çizimlerin, tabloların veya saatlerin kaymış olabileceğini göz önünde bulundurarak otobüs hatlarını (bus routes) akıllıca analiz et ve aşağıdaki JSON şemasına uygun bir JSON dizisi oluştur.
                
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
            return executeGeminiCall(requestBody, activeKey);
        } catch (Exception e) {
            log.error("Gemini otobüs hatları ayrıştırma hatası: ", e);
            return "[]";
        }
    }

    public String parseBusRoutesFromPdf(byte[] pdfBytes, String extractedText) {
        String activeKey = keyBusTransit != null && !keyBusTransit.isBlank() ? keyBusTransit : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. AI ile otobüs hatları PDF ayrıştırma atlanıyor. Boş veri döndürülüyor.");
            return "[]";
        }

        String prompt = """
                Sen Kentiva belediye ulaşım asistanısın. Sana verilen PDF belgesinde ve ekteki metinde, bir belediyenin otobüs hatları, durakları ve kalkış saatleri bilgileri yer almaktadır.
                Bu belgedeki karmaşık tabloları, çizimleri ve metinleri çok dikkatli analiz et. Kolonlardaki saatleri ve durak isimlerini birbirleriyle doğru eşleştir.
                Otobüs hatlarını (bus routes) aşağıdaki JSON şemasına uygun bir JSON dizisi olarak çıkar.
                
                ÖNEMLİ GEREKSİNİMLER:
                1. Duraklar (stops) listesi başlangıç durağından bitiş durağına doğru sıralı olmalıdır.
                2. Kalkış saatleri (schedule) weekday (hafta içi) mutlaka dolu olmalıdır. departuresFromStart başlangıç durağından kalkış saatlerini, departuresFromEnd ise bitiş durağından kalkış saatlerini içermelidir.
                3. PDF içindeki karmaşık satırlar veya sütunlar arasından her durak ismini ve kalkış saatlerini doğru bir şekilde çıkar.
                4. Yalnızca geçerli bir JSON dizisi döndür. Başka açıklama veya ```json bloğu ekleme.
                
                JSON formatı kesinlikle şu şekilde olmalıdır:
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
                
                Aşağıda PDF'ten çıkarılmış ham metin bulunmaktadır. Bu metni de PDF görüntüsüyle birlikte analiz etmek için kullan:
                [PDF'ten Çıkarılan Ham Metin]
                %s
                """.formatted(extractedText != null ? extractedText : "");

        try {
            String base64Pdf = java.util.Base64.getEncoder().encodeToString(pdfBytes);

            JSONObject partText = new JSONObject().put("text", prompt);
            JSONObject partPdf = new JSONObject().put("inlineData", new JSONObject()
                    .put("mimeType", "application/pdf")
                    .put("data", base64Pdf));

            JSONArray parts = new JSONArray().put(partText).put(partPdf);

            String requestBody = new JSONObject()
                    .put("contents", new JSONArray().put(
                            new JSONObject().put("parts", parts)
                    ))
                    .put("generationConfig", new JSONObject().put("response_mime_type", "application/json"))
                    .toString();

            return executeGeminiCall(requestBody, activeKey);
        } catch (Exception e) {
            log.error("Gemini otobüs hatları PDF ayrıştırma hatası: ", e);
            return "[]";
        }
    }

    public java.util.List<String> findDuplicateReports(Report newReport, java.util.List<Report> nearbyReports) {
        String activeKey = keyDuplicateDetection != null && !keyDuplicateDetection.isBlank() ? keyDuplicateDetection : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
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
                        .uri(geminiGenerateContentUrl() + "?key=" + activeKey)
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
        String activeKey = keyResolvedReports != null && !keyResolvedReports.isBlank() ? keyResolvedReports : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
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
                        .uri(geminiGenerateContentUrl() + "?key=" + activeKey)
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

    public record FeedbackAnalysisResult(String sentiment, String category) {}

    public FeedbackAnalysisResult analyzeFeedback(String content) {
        String activeKey = keyFeedbackAnalysis != null && !keyFeedbackAnalysis.isBlank() ? keyFeedbackAnalysis : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. Feedback analizi atlanıyor.");
            return new FeedbackAnalysisResult("NEUTRAL", "OTHER");
        }

        String prompt = String.format(
                """
                Aşağıdaki Kentiva mobil uygulaması kullanıcı geri bildirimini analiz et.
                Dönüş formatı kesinlikle şu şekilde JSON olmalıdır (başka hiçbir metin veya açıklama ekleme):
                {"sentiment": "POSITIVE|NEGATIVE|NEUTRAL", "category": "PERFORMANCE|UI_DESIGN|USER_SUGGESTION|OTHER"}
                
                Geri bildirim içeriği:
                %s
                """,
                content
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
                String text = executeGeminiCall(requestBody, activeKey);
                JSONObject analysis = new JSONObject(text);
                return new FeedbackAnalysisResult(
                        analysis.optString("sentiment", "NEUTRAL").toUpperCase(),
                        analysis.optString("category", "OTHER").toUpperCase()
                );
            } catch (Exception e) {
                log.warn("AI feedback analiz hatası (deneme {}): {}", attempt, e.getMessage());
            }
        }
        return new FeedbackAnalysisResult("NEUTRAL", "OTHER");
    }

    public String generateGlobalFeedbackReport(java.util.List<SystemFeedback> feedbacks) {
        String activeKey = keyFeedbackAnalysis != null && !keyFeedbackAnalysis.isBlank() ? keyFeedbackAnalysis : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. Global feedback raporu üretilemiyor.");
            return "Gemini API anahtarı yapılandırılmamış.";
        }
        if (feedbacks == null || feedbacks.isEmpty()) {
            return "Henüz sisteme girilmiş bir geri bildirim bulunmamaktadır.";
        }

        StringBuilder dataBuilder = new StringBuilder();
        for (int i = 0; i < feedbacks.size(); i++) {
            SystemFeedback fb = feedbacks.get(i);
            dataBuilder.append(String.format("- Puan: %d, Kategori: %s, Duygu: %s, Yorum: %s\n",
                    fb.getRating(), fb.getCategory(), fb.getSentiment(), fb.getContent()));
        }

        String prompt = String.format(
                """
                Sen Kentiva platformu baş yapay zeka analiz uzmanısın.
                Aşağıda kullanıcılardan gelen mobil uygulama geri bildirimlerinin listesi bulunmaktadır.
                Bu geri bildirimleri analiz ederek Türkçe dilinde profesyonel bir Markdown raporu oluştur.
                Raporda şu bölümler yer almalıdır:
                1. Genel Özet (Genel memnuniyet düzeyi, öne çıkan ana konular)
                2. Olumlu Yönler (Kullanıcıların en çok beğendiği özellikler)
                3. Geliştirilmesi Gereken Alanlar ve Hatalar (En sık şikayet edilen veya düzeltilmesi istenen noktalar)
                4. Yapay Zeka Önerileri (Uygulamanın kalitesini ve kullanıcı memnuniyetini artırmak için atılabilecek somut adımlar)
                
                Raporu estetik, okunaklı ve Markdown formatında sun.
                
                Geri Bildirimler:
                %s
                """,
                dataBuilder.toString()
        );

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
                        .uri(geminiGenerateContentUrl() + "?key=" + activeKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);
                return extractPlainText(response);
            } catch (Exception e) {
                log.warn("Global feedback raporu oluşturma hatası (deneme {}): {}", attempt, e.getMessage());
            }
        }
        return "Yapay zeka analiz raporu oluşturulurken bir hata meydana geldi.";
    }

    public String parseBusRoutesFromPdfMultiPass(byte[] pdfBytes, String extractedText) {
        String activeKey = keyBusTransit != null && !keyBusTransit.isBlank() ? keyBusTransit : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
            log.warn("Gemini API Key eksik. AI ile otobüs hatları PDF multi-pass ayrıştırma atlanıyor. Boş veri döndürülüyor.");
            return "[]";
        }

        JSONArray allRoutes = new JSONArray();

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFRenderer pdfRenderer = new PDFRenderer(document);
            int pageCount = Math.min(document.getNumberOfPages(), 20); // limit to 20 pages max
            log.info("PDF multi-pass analizi başlatılıyor. Toplam sayfa sayısı: {}, işlenecek sayfa sayısı: {}", document.getNumberOfPages(), pageCount);

            for (int i = 0; i < pageCount; i++) {
                log.info("Sayfa {} işleniyor...", i + 1);
                
                // Render page to Base64 PNG
                String base64Image = null;
                try {
                    BufferedImage bim = pdfRenderer.renderImageWithDPI(i, 150);
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    ImageIO.write(bim, "png", baos);
                    base64Image = Base64.getEncoder().encodeToString(baos.toByteArray());
                } catch (Exception e) {
                    log.error("Sayfa {} görüntüye dönüştürülürken hata oluştu: {}", i + 1, e.getMessage());
                    continue;
                }

                // Extract text for this single page
                String pageText = "";
                try {
                    PDFTextStripper stripper = new PDFTextStripper();
                    stripper.setStartPage(i + 1);
                    stripper.setEndPage(i + 1);
                    pageText = stripper.getText(document);
                } catch (Exception ex) {
                    log.warn("Sayfa {} metin çıkarma hatası: {}", i + 1, ex.getMessage());
                }

                // Pass 1: Yapı Tespiti
                String pass1Prompt = """
                        Sen Kentiva belediye ulaşım asistanısın. Sana verilen otobüs tarifesi sayfasının görüntüsünü ve ham metnini incele.
                        Bu sayfada hangi otobüs hatları var? Bu sayfada hangi otobüs hatları, kaç durak ve kaç sefer var?
                        Yanıtını sadece aşağıdaki JSON formatında bir dizi olarak dön. Başka hiçbir şey yazma:
                        [
                          {"routeCode": "Şİ", "routeName": "Şehir İçi", "pageContains": "stops_and_schedule"}
                        ]
                        Eğer bu sayfada herhangi bir otobüs hattı tarifi, durak veya saat bilgisi yoksa boş bir dizi dön: []
                        
                        Ham metin:
                        %s
                        """.formatted(pageText);

                JSONObject partText1 = new JSONObject().put("text", pass1Prompt);
                JSONObject partImage1 = new JSONObject().put("inlineData", new JSONObject()
                        .put("mimeType", "image/png")
                        .put("data", base64Image));

                String pass1Body = new JSONObject()
                        .put("contents", new JSONArray().put(
                                new JSONObject().put("parts", new JSONArray().put(partText1).put(partImage1))
                        ))
                        .put("generationConfig", new JSONObject().put("response_mime_type", "application/json"))
                        .toString();

                String pass1Response = null;
                try {
                    pass1Response = executeGeminiCall(pass1Body, activeKey);
                } catch (Exception e) {
                    log.error("Sayfa {} Pass 1 Yapı Tespiti hatası: {}", i + 1, e.getMessage());
                    continue;
                }

                if (pass1Response == null || pass1Response.isBlank() || pass1Response.equals("[]")) {
                    log.info("Sayfa {} üzerinde otobüs hattı bulunamadı.", i + 1);
                    continue;
                }

                JSONArray detectedRoutes;
                try {
                    detectedRoutes = new JSONArray(pass1Response);
                } catch (Exception e) {
                    log.warn("Sayfa {} Pass 1 yanıt ayrıştırma hatası: {}", i + 1, e.getMessage());
                    continue;
                }

                // Pass 2: Her tespit edilen hat için detay çıkarma
                for (int r = 0; r < detectedRoutes.length(); r++) {
                    JSONObject routeInfo = detectedRoutes.getJSONObject(r);
                    String routeCode = routeInfo.optString("routeCode", "").trim();
                    String routeName = routeInfo.optString("routeName", "").trim();

                    if (routeCode.isEmpty()) continue;

                    log.info("Sayfa {}: Hat detayları çıkarılıyor -> {} ({})", i + 1, routeName, routeCode);

                    String pass2Prompt = """
                            Sen Kentiva belediye ulaşım asistanısın. Ekteki otobüs tarifesi sayfa görüntüsünü ve ham metni kullanarak, "%s" (Kod: %s) isimli hat için durakları ve kalkış saatlerini detaylı olarak çıkar.
                            
                            Gereksinimler:
                            1. Duraklar (stops) listesi başlangıç durağından bitiş durağına doğru sıralı olmalıdır.
                            2. Kalkış saatleri (schedule) weekday (hafta içi) alanı dolu olmalıdır. departuresFromStart başlangıç durağından kalkış saatlerini, departuresFromEnd ise bitiş durağından kalkış saatlerini içermelidir.
                            3. Saatler "HH:mm" formatında olmalıdır (örneğin "07:30" veya "14:05"). "7:00" gibi saatleri "07:00" olarak düzelt.
                            4. Color alanı için uyumlu ve canlı bir hex renk (örn: "#10B981", "#3B82F6", "#F59E0B") seç.
                            5. Icon alanı için 'bus', 'graduation-cap', 'home' değerlerinden birini seç.
                            6. Yanıtını kesinlikle aşağıdaki JSON formatında dön. Başka hiçbir metin veya açıklama ekleme:
                            {
                              "code": "%s",
                              "name": "%s",
                              "color": "#3B82F6",
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
                            
                            Ham metin:
                            %s
                            """.formatted(routeName, routeCode, routeCode, routeName, pageText);

                    JSONObject partText2 = new JSONObject().put("text", pass2Prompt);
                    JSONObject partImage2 = new JSONObject().put("inlineData", new JSONObject()
                            .put("mimeType", "image/png")
                            .put("data", base64Image));

                    String pass2Body = new JSONObject()
                            .put("contents", new JSONArray().put(
                                    new JSONObject().put("parts", new JSONArray().put(partText2).put(partImage2))
                            ))
                            .put("generationConfig", new JSONObject().put("response_mime_type", "application/json"))
                            .toString();

                    try {
                        String pass2Response = executeGeminiCall(pass2Body, activeKey);
                        if (pass2Response != null && !pass2Response.isBlank()) {
                            JSONObject routeDetails = new JSONObject(pass2Response);
                            
                            // Validation & Normalization
                            validateAndNormalizeRoute(routeDetails);
                            
                            if (routeDetails.getJSONArray("stops").isEmpty()) {
                                log.warn("Hat {} için durak listesi boş olduğundan atlanıyor.", routeCode);
                                continue;
                            }
                            
                            allRoutes.put(routeDetails);
                        }
                    } catch (Exception e) {
                        log.error("Hat {} için Pass 2 Detay Çıkarma hatası: {}", routeCode, e.getMessage());
                    }
                }
            }

            // Merging duplicates
            JSONArray mergedRoutes = mergeDuplicateRoutes(allRoutes);
            return mergedRoutes.toString();

        } catch (Exception e) {
            log.error("Gemini otobüs hatları PDF multi-pass ayrıştırma hatası: ", e);
            return "[]";
        }
    }

    private void validateAndNormalizeRoute(JSONObject route) {
        // Ensure color starts with #
        String color = route.optString("color", "#3B82F6");
        if (!color.startsWith("#")) {
            color = "#" + color;
        }
        route.put("color", color);

        // Ensure icon is valid
        String icon = route.optString("icon", "bus");
        if (!List.of("bus", "graduation-cap", "home").contains(icon)) {
            icon = "bus";
        }
        route.put("icon", icon);

        // Ensure stops is an array
        if (!route.has("stops") || !(route.get("stops") instanceof JSONArray)) {
            route.put("stops", new JSONArray());
        }

        // Schedule normalization
        if (!route.has("schedule") || !(route.get("schedule") instanceof JSONObject)) {
            JSONObject schedule = new JSONObject();
            schedule.put("weekday", new JSONObject()
                    .put("departuresFromStart", new JSONArray())
                    .put("departuresFromEnd", new JSONArray()));
            route.put("schedule", schedule);
        }

        JSONObject schedule = route.getJSONObject("schedule");
        for (String key : List.of("weekday", "weekend", "saturday", "sunday")) {
            if (schedule.has(key) && schedule.get(key) instanceof JSONObject) {
                JSONObject daySched = schedule.getJSONObject(key);
                normalizeTimeList(daySched, "departuresFromStart");
                normalizeTimeList(daySched, "departuresFromEnd");
            } else if (key.equals("weekday")) {
                schedule.put("weekday", new JSONObject()
                        .put("departuresFromStart", new JSONArray())
                        .put("departuresFromEnd", new JSONArray()));
            }
        }
    }

    private void normalizeTimeList(JSONObject parent, String arrayKey) {
        if (!parent.has(arrayKey) || !(parent.get(arrayKey) instanceof JSONArray)) {
            parent.put(arrayKey, new JSONArray());
            return;
        }
        JSONArray times = parent.getJSONArray(arrayKey);
        JSONArray normalized = new JSONArray();
        java.util.TreeSet<String> uniqueSortedTimes = new java.util.TreeSet<>();

        for (int i = 0; i < times.length(); i++) {
            String time = times.optString(i, "").trim();
            // Match times like H:mm, HH:mm, H.mm, HH.mm
            time = time.replace(".", ":");
            if (time.matches("^\\d{1,2}:\\d{2}$")) {
                if (time.length() == 4) {
                    time = "0" + time; // e.g. 7:30 -> 07:30
                }
                uniqueSortedTimes.add(time);
            }
        }
        for (String t : uniqueSortedTimes) {
            normalized.put(t);
        }
        parent.put(arrayKey, normalized);
    }

    private JSONArray mergeDuplicateRoutes(JSONArray routes) {
        Map<String, JSONObject> mergedMap = new LinkedHashMap<>();

        for (int i = 0; i < routes.length(); i++) {
            JSONObject current = routes.getJSONObject(i);
            String code = current.optString("code", "").trim().toUpperCase();
            if (code.isEmpty()) continue;

            if (!mergedMap.containsKey(code)) {
                mergedMap.put(code, current);
            } else {
                JSONObject existing = mergedMap.get(code);
                
                // Merge stops (keep all distinct stops)
                JSONArray existingStops = existing.getJSONArray("stops");
                JSONArray currentStops = current.getJSONArray("stops");
                Set<String> stopsSet = new LinkedHashSet<>();
                for (int j = 0; j < existingStops.length(); j++) {
                    stopsSet.add(existingStops.getString(j));
                }
                for (int j = 0; j < currentStops.length(); j++) {
                    stopsSet.add(currentStops.getString(j));
                }
                existing.put("stops", new JSONArray(stopsSet));

                // Merge schedule
                JSONObject existingSched = existing.getJSONObject("schedule");
                JSONObject currentSched = current.getJSONObject("schedule");

                for (String key : List.of("weekday", "weekend", "saturday", "sunday")) {
                    if (currentSched.has(key)) {
                        if (!existingSched.has(key)) {
                            existingSched.put(key, currentSched.getJSONObject(key));
                        } else {
                            JSONObject existingDay = existingSched.getJSONObject(key);
                            JSONObject currentDay = currentSched.getJSONObject(key);

                            mergeTimes(existingDay, currentDay, "departuresFromStart");
                            mergeTimes(existingDay, currentDay, "departuresFromEnd");
                        }
                    }
                }
            }
        }

        JSONArray result = new JSONArray();
        for (JSONObject route : mergedMap.values()) {
            result.put(route);
        }
        return result;
    }

    private void mergeTimes(JSONObject existingDay, JSONObject currentDay, String key) {
        JSONArray existingTimes = existingDay.optJSONArray(key);
        JSONArray currentTimes = currentDay.optJSONArray(key);

        Set<String> timeSet = new java.util.TreeSet<>();
        if (existingTimes != null) {
            for (int i = 0; i < existingTimes.length(); i++) {
                timeSet.add(existingTimes.getString(i));
            }
        }
        if (currentTimes != null) {
            for (int i = 0; i < currentTimes.length(); i++) {
                timeSet.add(currentTimes.getString(i));
            }
        }
        existingDay.put(key, new JSONArray(timeSet));
    }

    private static SimpleClientHttpRequestFactory requestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(90_000);
        return factory;
    }
}
