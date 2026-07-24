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
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
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
    private final RestClient duplicateDetectionRestClient = RestClient.builder()
            .requestFactory(duplicateDetectionRequestFactory())
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

        // Kategoriye özel ton ve terminoloji belirleme
        String categoryName = report.getCategory().getName();
        String categoryContext = buildCategoryContext(categoryName);

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

        String systemInstruction = String.format(
                """
                Sen Kentiva şehir bildirim platformunun analiz asistanısın. Aşağıdaki vatandaş bildirimini analiz et.
                Geçerli kategori adları (yalnızca bunlardan birini öner): [%s]
                Mevcut seçilen kategori: %s
                Rapor içerik dili: %s
                
                ÖNEMLİ — Kategoriye Özel Yanıt Tonu:
                %s
                Yanıt taslağını (reply_draft) oluştururken mutlaka bu kategorinin terminolojisini, tonunu ve bağlamını kullan. Genel/jenerik yanıtlar üretme; kategoriye özgü, profesyonel ve empatik bir dil kullan.
                
                JSON döndür (İngilizce anahtarlar):
                {"priority":"LOW|MEDIUM|HIGH|CRITICAL","summary":"max 25 kelime, staff için Türkçe","is_category_correct":true/false,"suggested_category_name":"yalnızca listeden bir ad veya mevcut kategori","suggested_title":"kısa başlık (rapor diliyle uyumlu, max 10 kelime)","sla_risk":"LOW|MEDIUM|HIGH","duplicate_hint":"mükerrer notu Türkçe veya boş","reply_draft":"%s","priority_rationale":"öncelik gerekçesi Türkçe, max 20 kelime"}
                """,
                categoryOptions,
                categoryName,
                lang,
                categoryContext,
                String.format(replyDraftInstruction, replyLanguage)
        );

        String userContent = String.format(
                """
                Aşağıdaki vatandaş bildirimini analiz et:
                Başlık: %s
                Açıklama: %s
                """,
                report.getTitle(),
                report.getDescription()
        );

        String requestBody = new JSONObject()
                .put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(
                        new JSONObject().put("text", systemInstruction)
                )))
                .put("contents", new JSONArray().put(
                        new JSONObject().put("parts", new JSONArray().put(
                                new JSONObject().put("text", userContent)
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
                .put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(
                        new JSONObject().put("text", prompt)
                )))
                .put("contents", new JSONArray().put(
                        new JSONObject().put("parts", new JSONArray().put(
                                new JSONObject().put("text", "Lütfen şablonu üret.")
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

    public java.util.List<String> findDuplicateReports(Report newReport, java.util.List<Report> nearbyReports) {
        String activeKey = keyDuplicateDetection != null && !keyDuplicateDetection.isBlank() ? keyDuplicateDetection : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
            log.debug("Gemini duplicate key eksik; semantik analiz atlanıyor.");
            return null;
        }
        if (nearbyReports == null || nearbyReports.isEmpty()) {
            return java.util.List.of();
        }

        String systemInstruction = "Sen Kentiva şehir bildirim platformunun mükerrer ihbar analiz uzmanısın. "
                + "Yakındaki ihbarlardan hangilerinin yeni ihbar ile aynı fiziksel problemi (örneğin aynı çukuru, aynı sönmüş sokak lambasını, aynı çöp yığınını) bildirdiğini tespit et. Lütfen sadece kesin olarak aynı probleme ait olan ihbarları seç.\n"
                + "Yanıtı kesinlikle sadece JSON formatında, aynı probleme ait olan ihbarların ID'lerini içeren bir dizi olarak dön. Örneğin: [\"id1\", \"id2\"]. Eğer hiçbiri aynı probleme ait değilse boş bir dizi dönün: []. Başka hiçbir açıklama, markdown veya metin eklemeyin.";

        StringBuilder userContentBuilder = new StringBuilder();
        userContentBuilder.append("Yeni bir ihbar kaydı oluşturuldu. Bu yeni ihbarın bilgileri şöyledir:\n");
        userContentBuilder.append("ID: ").append(newReport.getId()).append("\n");
        userContentBuilder.append("Başlık: ").append(newReport.getTitle()).append("\n");
        userContentBuilder.append("Açıklama: ").append(newReport.getDescription()).append("\n");
        if (newReport.getCategory() != null) {
            userContentBuilder.append("Kategori: ").append(newReport.getCategory().getName()).append("\n");
        }
        userContentBuilder.append("\nKonum olarak bu yeni ihbarın yakınında bulunan aktif ihbarların listesi:\n");
        for (int i = 0; i < nearbyReports.size(); i++) {
            Report r = nearbyReports.get(i);
            userContentBuilder.append(i + 1).append(". İhbar:\n");
            userContentBuilder.append("  ID: ").append(r.getId()).append("\n");
            userContentBuilder.append("  Başlık: ").append(r.getTitle()).append("\n");
            userContentBuilder.append("  Açıklama: ").append(r.getDescription()).append("\n");
            if (r.getCategory() != null) {
                userContentBuilder.append("  Kategori: ").append(r.getCategory().getName()).append("\n");
            }
            userContentBuilder.append("\n");
        }

        String requestBody = new JSONObject()
                .put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(
                        new JSONObject().put("text", systemInstruction)
                )))
                .put("contents", new JSONArray().put(
                        new JSONObject().put("parts", new JSONArray().put(
                                new JSONObject().put("text", userContentBuilder.toString())
                        ))
                ))
                .put("generationConfig", new JSONObject().put("response_mime_type", "application/json"))
                .toString();

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String response = duplicateDetectionRestClient.post()
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

        String systemInstruction = "Aşağıda bir belediyeye ait çözülen vatandaş ihbarlarının listesi verilmiştir. "
                + "Bu ihbarlardan, belediyenin başarısını/hizmet kalitesini halka en iyi gösteren ve kamu yararı taşıyan "
                + "(örneğin yol onarımı, park temizliği, aydınlatma tamiri gibi olumlu sonuçlar barındıran) en iyi 3 tanesini seç.\n"
                + "Kesinlikle sadece seçtiğin en fazla 3 ihbarın ID'sini içeren bir JSON dizi formatında yanıt dön. "
                + "Örneğin: [\"id1\", \"id2\"]. Başka hiçbir kelime, açıklama veya markdown biçimlendirmesi ekleme.";

        StringBuilder userContentBuilder = new StringBuilder();
        for (int i = 0; i < resolvedReports.size(); i++) {
            Report r = resolvedReports.get(i);
            userContentBuilder.append("İhbar ").append(i + 1).append(":\n");
            userContentBuilder.append("  ID: ").append(r.getId()).append("\n");
            userContentBuilder.append("  Başlık: ").append(r.getTitle()).append("\n");
            userContentBuilder.append("  Açıklama: ").append(r.getDescription()).append("\n");
            userContentBuilder.append("  Kategori: ").append(r.getCategory() != null ? r.getCategory().getName() : "Genel").append("\n\n");
        }

        String requestBody = new JSONObject()
                .put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(
                        new JSONObject().put("text", systemInstruction)
                )))
                .put("contents", new JSONArray().put(
                        new JSONObject().put("parts", new JSONArray().put(
                                new JSONObject().put("text", userContentBuilder.toString())
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

        String systemInstruction = "Aşağıdaki Kentiva mobil uygulaması kullanıcı geri bildirimini analiz et.\n"
                + "Dönüş formatı kesinlikle şu şekilde JSON olmalıdır (başka hiçbir metin veya açıklama ekleme):\n"
                + "{\"sentiment\": \"POSITIVE|NEGATIVE|NEUTRAL\", \"category\": \"PERFORMANCE|UI_DESIGN|USER_SUGGESTION|OTHER\"}";

        String requestBody = new JSONObject()
                .put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(
                        new JSONObject().put("text", systemInstruction)
                )))
                .put("contents", new JSONArray().put(
                        new JSONObject().put("parts", new JSONArray().put(
                                new JSONObject().put("text", "Geri bildirim içeriği:\n" + content)
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

        String systemInstruction = "Sen Kentiva platformu baş yapay zeka analiz uzmanısın.\n"
                + "Aşağıda kullanıcılardan gelen mobil uygulama geri bildirimlerinin listesi bulunmaktadır.\n"
                + "Bu geri bildirimleri analiz ederek Türkçe dilinde profesyonel bir Markdown raporu oluştur.\n"
                + "Raporda şu bölümler yer almalıdır:\n"
                + "1. Genel Özet (Genel memnuniyet düzeyi, öne çıkan ana konular)\n"
                + "2. Olumlu Yönler (Kullanıcıların en çok beğendiği özellikler)\n"
                + "3. Geliştirilmesi Gereken Alanlar ve Hatalar (En sık şikayet edilen veya düzeltilmesi istenen noktalar)\n"
                + "4. Yapay Zeka Önerileri (Uygulamanın kalitesini ve kullanıcı memnuniyetini artırmak için atılabilecek somut adımlar)\n"
                + "\nRaporu estetik, okunaklı ve Markdown formatında sun.";

        String requestBody = new JSONObject()
                .put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(
                        new JSONObject().put("text", systemInstruction)
                )))
                .put("contents", new JSONArray().put(
                        new JSONObject().put("parts", new JSONArray().put(
                                new JSONObject().put("text", "Geri Bildirimler:\n" + dataBuilder.toString())
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

    /**
     * İhbar kategorisine göre AI yanıt tonu ve terminoloji bağlamı oluşturur.
     * Bu bağlam, reply_draft üretiminde kategoriye özgü dil ve empati kullanılmasını sağlar.
     */
    private String buildCategoryContext(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return "Genel belediye hizmetleri bağlamında profesyonel ve nazik bir ton kullan.";
        }
        String lower = categoryName.toLowerCase().replaceAll("[^a-zçğıöşü\\s]", "");
        
        if (lower.contains("yol") || lower.contains("asfalt") || lower.contains("kaldırım") || lower.contains("altyapı")) {
            return "Bu bir yol/altyapı bakım bildirimidir. Teknik dil kullan (asfalt onarımı, yol yüzeyi, kaldırım düzenlemesi, altyapı çalışması vb.). Trafik güvenliği vurgusunu ekle. Çözüm sürecinde hangi teknik ekiplerin görevlendirildiğini belirt.";
        }
        if (lower.contains("park") || lower.contains("bahçe") || lower.contains("yeşil") || lower.contains("ağaç")) {
            return "Bu bir park ve yeşil alan bildirimidir. Çevre-dostu ve doğa koruma odaklı bir dil kullan. Yeşil alan bakımı, peyzaj düzenlemesi, ağaç budama gibi terminolojiyi tercih et. Yaşam kalitesine katkısını vurgula.";
        }
        if (lower.contains("aydınlatma") || lower.contains("lamba") || lower.contains("ışık") || lower.contains("elektrik")) {
            return "Bu bir aydınlatma/elektrik bildirimidir. Güvenlik vurgusunu ön plana çıkar. Sokak aydınlatması, trafik sinyalizasyonu, enerji verimliliği gibi terimleri kullan. Gece güvenliği ve yaya emniyetine değin.";
        }
        if (lower.contains("çöp") || lower.contains("temizlik") || lower.contains("atık") || lower.contains("çevre")) {
            return "Bu bir çevre temizliği bildirimidir. Halk sağlığı ve çevre koruma vurgusunu kullan. Atık toplama, geri dönüşüm, çevre kirliliği, dezenfeksiyon gibi terimleri tercih et. Sağlıklı yaşam çevresi mesajını ver.";
        }
        if (lower.contains("su") || lower.contains("kanalizasyon") || lower.contains("boru") || lower.contains("taşkın")) {
            return "Bu bir su/kanalizasyon altyapısı bildirimidir. Su şebekesi, kanalizasyon hattı, yağmur suyu tahliyesi, su arıtma gibi teknik terimleri kullan. İçme suyu güvenliği veya sel/taşkın riskine değin.";
        }
        if (lower.contains("trafik") || lower.contains("ulaşım") || lower.contains("otopark") || lower.contains("tabela")) {
            return "Bu bir ulaşım/trafik bildirimidir. Trafik düzeni, yol işaretleme, sinyalizasyon, otopark kapasitesi, toplu taşıma erişimi gibi terimleri kullan. Trafik güvenliği ve düzenini vurgula.";
        }
        if (lower.contains("imar") || lower.contains("yapı") || lower.contains("inşaat") || lower.contains("ruhsat")) {
            return "Bu bir imar/yapı denetimi bildirimidir. İmar mevzuatı, yapı denetimi, ruhsat kontrolü gibi resmi terminolojiyi kullan. Kentsel düzen ve yapı güvenliğini vurgula. Mevzuata uygunluk mesajını ver.";
        }
        if (lower.contains("hayvan") || lower.contains("sokak") || lower.contains("barınak") || lower.contains("veteriner")) {
            return "Bu bir hayvan hakları/sokak hayvanları bildirimidir. Hayvan refahı, barınak hizmetleri, kısırlaştırma, aşılama gibi terimleri kullan. Empati ve şefkat dolu bir dil tercih et. Hayvan hakları duyarlılığını göster.";
        }
        if (lower.contains("gürültü") || lower.contains("ses") || lower.contains("rahatsızlık")) {
            return "Bu bir gürültü/çevre rahatsızlığı bildirimidir. Gürültü kirliliği, yaşam hakkı, çevre sağlığı gibi terimleri kullan. Vatandaşın yaşam konforunun korunmasına vurgu yap.";
        }
        if (lower.contains("zabıta") || lower.contains("ruhsat") || lower.contains("denetim") || lower.contains("işgal")) {
            return "Bu bir zabıta/denetim bildirimidir. Belediye mevzuatı, denetim, kaldırım işgali, ruhsatsız faaliyet gibi terimleri kullan. Kamu düzeni ve mevzuata uygunluk vurgusunu yap.";
        }
        // Varsayılan bağlam
        return "Bu bir '" + categoryName + "' kategorisinde vatandaş bildirimidir. Bu kategoriye uygun profesyonel terminoloji ve empati ile yanıt oluştur. Belediye hizmet kalitesini ve vatandaş memnuniyetini ön plana çıkar.";
    }

    private static SimpleClientHttpRequestFactory requestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(180_000); // 3 dakika — multi-pass PDF analizi (20 sayfa × 2 pass = ~40 Gemini çağrısı)
        return factory;
    }

    private static SimpleClientHttpRequestFactory duplicateDetectionRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(10_000);
        return factory;
    }

    public double[] getEmbedding(String title, String description) {
        String activeKey = keyDuplicateDetection != null && !keyDuplicateDetection.isBlank() ? keyDuplicateDetection : apiKey;
        if (activeKey == null || activeKey.isBlank() || activeKey.equals("your-gemini-api-key")) {
            log.debug("Gemini duplicate key eksik; embedding üretimi atlanıyor.");
            return null;
        }

        String textToEmbed = "Başlık: " + (title != null ? title : "") + "\nAçıklama: " + (description != null ? description : "");
        
        try {
            JSONObject contentObj = new JSONObject()
                    .put("parts", new JSONArray().put(new JSONObject().put("text", textToEmbed)));
            
            JSONObject requestBody = new JSONObject()
                    .put("model", "models/text-embedding-004")
                    .put("content", contentObj);

            String response = duplicateDetectionRestClient.post()
                    .uri("https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=" + activeKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody.toString())
                    .retrieve()
                    .body(String.class);

            JSONObject json = new JSONObject(response);
            JSONArray values = json.getJSONObject("embedding").getJSONArray("values");
            
            double[] vector = new double[values.length()];
            for (int i = 0; i < values.length(); i++) {
                vector[i] = values.getDouble(i);
            }
            return vector;
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            throw e;
        } catch (Exception e) {
            log.error("Gemini embedding üretilemedi: {}", e.getMessage());
            return null;
        }
    }

    public boolean isDuplicateDetectionAvailable() {
        String activeKey = keyDuplicateDetection != null && !keyDuplicateDetection.isBlank()
                ? keyDuplicateDetection
                : apiKey;
        return activeKey != null
                && !activeKey.isBlank()
                && !activeKey.equals("your-gemini-api-key");
    }
}
