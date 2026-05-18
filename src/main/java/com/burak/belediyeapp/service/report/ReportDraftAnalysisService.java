package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.request.report.ReportDraftAnalysisRequest;
import com.burak.belediyeapp.dto.response.report.ReportDraftAnalysisResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportCategory;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.service.ai.ContentLanguageDetector;
import com.burak.belediyeapp.service.ai.GeminiService;
import com.burak.belediyeapp.service.ai.HeuristicReportAnalyzer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ReportDraftAnalysisService {

    private final IReportCategoryRepository categoryRepository;
    private final GeminiService geminiService;
    private final HeuristicReportAnalyzer heuristicReportAnalyzer;

    /**
     * Vatandaşın taslak için anlık AI ön analizi. Gemini HTTP çağrısı yapıldığı için
     * outer @Transactional KULLANILMAZ → DB connection latensiyi beklemez.
     * Sadece kategori okuması kısa bir read-only txn içinde yapılır.
     */
    public ReportDraftAnalysisResponse analyze(AppUser user, ReportDraftAnalysisRequest request) {
        ReportCategory category = loadCategory(request.categoryId());

        String lang = request.contentLanguage() != null && !request.contentLanguage().isBlank()
                ? request.contentLanguage()
                : ContentLanguageDetector.detect(request.title(), request.description());

        Report draft = Report.builder()
                .title(request.title())
                .description(request.description() != null ? request.description() : "")
                .category(category)
                .contentLanguage(lang)
                .reporter(user)
                .build();

        GeminiService.AIAnalysisResult ai = geminiService.analyzeReport(draft);
        String source = "Google Gemini";
        if (ai == null) {
            ai = heuristicReportAnalyzer.analyze(draft);
            source = "Kural tabanlı analiz (Gemini yapılandırılmadı)";
        }

        List<String> steps = buildSteps(lang, ai, category.getName());
        return new ReportDraftAnalysisResponse(
                ai.priority(),
                ai.summary(),
                ai.suggestedCategoryName(),
                ai.isCategoryCorrect(),
                ai.slaRisk() != null && !ai.slaRisk().isBlank() ? ai.slaRisk() : "MEDIUM",
                ai.priorityRationale() != null ? ai.priorityRationale() : "",
                source,
                steps);
    }

    @Transactional(readOnly = true)
    protected ReportCategory loadCategory(String categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Kategori", "id", categoryId));
    }

    private static List<String> buildSteps(String lang, GeminiService.AIAnalysisResult ai, String selectedCategory) {
        boolean tr = !"en".equalsIgnoreCase(lang) && !"ar".equalsIgnoreCase(lang);
        List<String> steps = new ArrayList<>();
        steps.add(tr ? "Yapay zeka bildirimi inceliyor…" : "AI is analyzing your report…");
        String issue = ai.summary() != null && !ai.summary().isBlank()
                ? ai.summary()
                : (tr ? "Sorun: " + selectedCategory : "Issue: " + selectedCategory);
        steps.add(issue);
        String urgency = tr
                ? "Aciliyet: " + priorityLabelTr(ai.priority()) + (ai.priorityRationale() != null && !ai.priorityRationale().isBlank()
                ? " — " + ai.priorityRationale()
                : "")
                : "Urgency: " + ai.priority();
        steps.add(urgency);
        String route = tr
                ? "Önerilen kategori: " + ai.suggestedCategoryName()
                : "Suggested category: " + ai.suggestedCategoryName();
        steps.add(route);
        return steps;
    }

    private static String priorityLabelTr(String priority) {
        if (priority == null) {
            return "Orta";
        }
        return switch (priority.toUpperCase(Locale.ROOT)) {
            case "CRITICAL" -> "Kritik";
            case "HIGH" -> "Yüksek";
            case "LOW" -> "Düşük";
            default -> "Orta";
        };
    }
}
