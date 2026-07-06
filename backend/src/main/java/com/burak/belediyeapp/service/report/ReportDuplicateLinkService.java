package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.burak.belediyeapp.service.ai.GeminiService;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Yakın konumdaki aktif ihbarları aynı {@code duplicate_group_id} altında birleştirir.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportDuplicateLinkService {

    private final IReportRepository reportRepository;
    private final GeminiService geminiService;

    @Value("${app.report.duplicate-radius-meters:75}")
    private double radiusMeters;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private ReportDuplicateLinkService self;

    @Transactional
    public void linkNearbyDuplicatesOptimized(String reportId) {
        Report report = reportRepository.findById(reportId).orElse(null);
        if (report == null || report.getLocation() == null || report.getMunicipality() == null) {
            return;
        }

        // 1. Gemini'dan embedding al
        double[] embedding = geminiService.getEmbedding(report.getTitle(), report.getDescription());
        if (embedding == null) {
            log.warn("Embedding üretilemedi, konum tabanlı fallback akışı devreye alınıyor: reportId={}", reportId);
            linkNearbyDuplicates(reportId);
            return;
        }

        try {
            // 2. Embedding değerini veritabanına kaydet
            String embeddingString = java.util.Arrays.toString(embedding);
            reportRepository.updateReportEmbedding(reportId, embeddingString);

            // 3. Mesafe ve semantik threshold'lara göre kontrol et
            double radius = radiusMeters > 0 ? radiusMeters : 75.0;
            String categoryId = report.getCategory() != null ? report.getCategory().getId() : null;
            java.util.List<Report> duplicatesToLink = new java.util.ArrayList<>();

            // Kesin eşleşme threshold'u: 0.12 (Direct Auto-Link, LLM çağrısı yok)
            java.util.List<Report> strictMatches = reportRepository.findSemanticNearbyInMunicipality(
                    report.getLocation().getY(),
                    report.getLocation().getX(),
                    radius,
                    report.getMunicipality().getId(),
                    reportId,
                    categoryId,
                    embeddingString,
                    0.12,
                    10
            );

            if (!strictMatches.isEmpty()) {
                log.info("Semantik kesin eşleşmeler (Auto-Link) bulundu. Adet={}", strictMatches.size());
                duplicatesToLink.addAll(strictMatches);
            } else {
                // Sınırda eşleşme threshold'u: 0.28 (LLM ile doğrulama gerekir)
                java.util.List<Report> borderlineMatches = reportRepository.findSemanticNearbyInMunicipality(
                        report.getLocation().getY(),
                        report.getLocation().getX(),
                        radius,
                        report.getMunicipality().getId(),
                        reportId,
                        categoryId,
                        embeddingString,
                        0.28,
                        5
                );
                
                if (!borderlineMatches.isEmpty()) {
                    log.info("Sınırda semantik eşleşmeler bulundu. Gemini doğrulaması başlatılıyor. Adet={}", borderlineMatches.size());
                    java.util.List<String> confirmedIds = geminiService.findDuplicateReports(report, borderlineMatches);
                    if (confirmedIds != null && !confirmedIds.isEmpty()) {
                        for (Report r : borderlineMatches) {
                            if (confirmedIds.contains(r.getId())) {
                                duplicatesToLink.add(r);
                            }
                        }
                    }
                }
            }

            if (duplicatesToLink.isEmpty()) {
                return;
            }

            String currentGroupId = report.getDuplicateGroupId();
            String groupId = resolveGroupId(duplicatesToLink, currentGroupId);

            java.util.List<String> reportIdsToUpdate = new java.util.ArrayList<>();
            for (Report r : duplicatesToLink) {
                if (!groupId.equals(r.getDuplicateGroupId())) {
                    reportIdsToUpdate.add(r.getId());
                }
            }
            if (!groupId.equals(currentGroupId)) {
                reportIdsToUpdate.add(reportId);
            }

            if (!reportIdsToUpdate.isEmpty()) {
                persistDuplicateGroupId(reportIdsToUpdate, groupId);
            }
        } catch (Exception e) {
            log.warn("pgvector/Embedding araması başarısız oldu (muhtemelen pgvector eklentisi kurulu değil), konum tabanlı fallback akışı devreye alınıyor: {}", e.getMessage());
            linkNearbyDuplicates(reportId);
        }
    }

    public void linkNearbyDuplicates(String reportId) {
        DuplicateContext ctx = self.loadDuplicateContext(reportId);
        if (ctx == null || ctx.nearby().isEmpty()) {
            return;
        }

        List<Report> duplicatesToLink;
        List<String> duplicateIds = geminiService.findDuplicateReports(ctx.report(), ctx.nearby());

        if (duplicateIds == null) {
            // Hata veya API key eksikliği durumunda mesafe tabanlı (fail-safe) fallback
            log.info("Semantik analiz yapılamadı veya atlandı. Konum tabanlı varsayılan birleştirme uygulanıyor.");
            duplicatesToLink = ctx.nearby();
        } else {
            // Gemini tarafından aynı probleme ait olduğu doğrulananları filtrele
            duplicatesToLink = new java.util.ArrayList<>();
            for (Report r : ctx.nearby()) {
                if (duplicateIds.contains(r.getId())) {
                    duplicatesToLink.add(r);
                }
            }
        }

        if (duplicatesToLink.isEmpty()) {
            return;
        }

        String currentGroupId = ctx.report().getDuplicateGroupId();
        String groupId = resolveGroupId(duplicatesToLink, currentGroupId);

        List<String> reportIdsToUpdate = new java.util.ArrayList<>();
        for (Report r : duplicatesToLink) {
            if (!groupId.equals(r.getDuplicateGroupId())) {
                reportIdsToUpdate.add(r.getId());
            }
        }
        if (!groupId.equals(currentGroupId)) {
            reportIdsToUpdate.add(reportId);
        }

        if (!reportIdsToUpdate.isEmpty()) {
            self.persistDuplicateGroupId(reportIdsToUpdate, groupId);
        }
    }

    public record DuplicateContext(Report report, List<Report> nearby) {}

    @Transactional(readOnly = true)
    public DuplicateContext loadDuplicateContext(String reportId) {
        Report report = reportRepository.findById(reportId).orElse(null);
        if (report == null || report.getLocation() == null || report.getMunicipality() == null) {
            return null;
        }

        // Force initialize lazy proxies required by duplicate check prompt building
        if (report.getCategory() != null) {
            report.getCategory().getName();
        }
        if (report.getMunicipality() != null) {
            report.getMunicipality().getName();
        }

        double lat = report.getLocation().getY();
        double lng = report.getLocation().getX();
        String municipalityId = report.getMunicipality().getId();
        String categoryId = report.getCategory() != null ? report.getCategory().getId() : null;

        List<Report> nearby = reportRepository.findActiveNearbyInMunicipality(
                lat, lng, radiusMeters, municipalityId, report.getId(), categoryId, 15);

        for (Report r : nearby) {
            if (r.getCategory() != null) {
                r.getCategory().getName();
            }
        }

        return new DuplicateContext(report, nearby);
    }

    @Transactional
    public void persistDuplicateGroupId(List<String> reportIds, String groupId) {
        List<Report> reports = reportRepository.findAllById(reportIds);
        for (Report r : reports) {
            r.setDuplicateGroupId(groupId);
        }
        reportRepository.saveAll(reports);

        int size = reportRepository.countByDuplicateGroupId(groupId);
        if (size > 1) {
            log.info("Duplicate group {} now has {} reports", groupId, size);
        }
    }

    private static String resolveGroupId(List<Report> nearby, String currentGroupId) {
        if (currentGroupId != null && !currentGroupId.isBlank()) {
            return currentGroupId;
        }
        for (Report r : nearby) {
            if (r.getDuplicateGroupId() != null && !r.getDuplicateGroupId().isBlank()) {
                return r.getDuplicateGroupId();
            }
        }
        return UUID.randomUUID().toString();
    }

    @Transactional(readOnly = true)
    public int countInGroup(String duplicateGroupId) {
        if (duplicateGroupId == null || duplicateGroupId.isBlank()) {
            return 1;
        }
        return reportRepository.countByDuplicateGroupId(duplicateGroupId);
    }

    @Transactional(readOnly = true)
    public List<Report> membersOfGroup(String duplicateGroupId, String excludeReportId) {
        if (duplicateGroupId == null || duplicateGroupId.isBlank()) {
            return List.of();
        }
        return reportRepository.findByDuplicateGroupIdAndIdNot(duplicateGroupId, excludeReportId);
    }
}
