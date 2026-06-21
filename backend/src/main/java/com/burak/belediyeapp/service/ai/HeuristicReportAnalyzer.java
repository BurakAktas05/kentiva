package com.burak.belediyeapp.service.ai;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.service.notification.ReportLanguageMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;

/**
 * Gemini kullanılamadığında kural tabanlı öncelik ve kategori önerisi.
 */
@Component
@RequiredArgsConstructor
public class HeuristicReportAnalyzer {

    private final IReportCategoryRepository categoryRepository;

    public GeminiService.AIAnalysisResult analyze(Report report) {
        return analyze(report, null);
    }

    public GeminiService.AIAnalysisResult analyze(Report report, com.burak.belediyeapp.entity.ReportStatus targetStatus) {
        String text = ((report.getTitle() != null ? report.getTitle() : "")
                + " "
                + (report.getDescription() != null ? report.getDescription() : "")).toLowerCase(Locale.forLanguageTag("tr"));

        String priority = inferPriority(text);
        String suggestedCategory = inferCategoryName(text, report.getCategory().getName());
        String summary = truncate(report.getDescription(), 120);
        boolean categoryCorrect = suggestedCategory.equalsIgnoreCase(report.getCategory().getName());

        String lang = report.getContentLanguage() != null ? report.getContentLanguage() : "tr";
        String replyDraft = ReportLanguageMessages.heuristicReplyDraft(lang, targetStatus);
        String summaryFallback = switch (ReportLanguageMessages.normalizeLang(lang)) {
            case "en" -> "Citizen report received.";
            case "ar" -> "تم استلام بلاغ المواطن.";
            default -> "Vatandaş bildirimi alındı.";
        };

        return new GeminiService.AIAnalysisResult(
                priority,
                summary.isBlank() ? summaryFallback : summary,
                categoryCorrect,
                suggestedCategory,
                report.getTitle(),
                priority.equals("CRITICAL") || priority.equals("HIGH") ? "HIGH" : "LOW",
                replyDraft,
                "",
                "Kural tabanlı analiz"
        );
    }

    private static String inferPriority(String text) {
        if (containsAny(text, "acil", "tehlike", "kaza", "yangın", "sel", "çökme", "elektrik çarpm")) {
            return "CRITICAL";
        }
        if (containsAny(text, "çukur", "kırık", "devril", "kanalizasyon", "su baskın", "kaldırım")) {
            return "HIGH";
        }
        if (containsAny(text, "çöp", "koku", "gürültü", "aydınlatma", "lamba")) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String inferCategoryName(String text, String current) {
        if (containsAny(text, "çukur", "asfalt", "yol", "kaldırım", "trafik")) {
            return pickCategory("Yol", "Altyapı", current);
        }
        if (containsAny(text, "çöp", "temizlik", "sokak temiz")) {
            return pickCategory("Çevre", "Temizlik", "Çöp", current);
        }
        if (containsAny(text, "park", "ağaç", "yeşil")) {
            return pickCategory("Park", "Bahçe", current);
        }
        if (containsAny(text, "lamba", "aydınlatma", "ışık")) {
            return pickCategory("Aydınlatma", current);
        }
        return current;
    }

    private String pickCategory(String... candidates) {
        for (String name : candidates) {
            Optional<String> found = categoryRepository.findByName(name).map(c -> c.getName());
            if (found.isPresent()) {
                return found.get();
            }
        }
        return categoryRepository.findAllByActiveTrue().stream()
                .findFirst()
                .map(c -> c.getName())
                .orElse("Diğer");
    }

    private static boolean containsAny(String text, String... needles) {
        for (String n : needles) {
            if (text.contains(n)) {
                return true;
            }
        }
        return false;
    }

    private static String truncate(String s, int max) {
        if (s == null || s.isBlank()) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
