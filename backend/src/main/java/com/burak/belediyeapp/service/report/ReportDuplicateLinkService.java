package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

import com.burak.belediyeapp.service.ai.GeminiService;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

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

    /** Kesin eşleşme (auto-link) threshold — düşük = daha sıkı, yüksek = daha gevşek. */
    @Value("${app.report.duplicate.strict-threshold:0.12}")
    private double strictThreshold;

    /** Sınırda eşleşme (LLM doğrulama) threshold. */
    @Value("${app.report.duplicate.borderline-threshold:0.28}")
    private double borderlineThreshold;

    /** Gemini 429/503 retry — maksimum deneme. */
    @Value("${app.report.duplicate.max-retries:3}")
    private int maxRetries;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private ReportDuplicateLinkService self;

    // ── Hata sayaçları (metrik/loglama) ──────────────────
    private final AtomicLong embeddingFailureCount = new AtomicLong(0);
    private final AtomicLong semanticSearchFailureCount = new AtomicLong(0);
    private final AtomicLong rateLimitHitCount = new AtomicLong(0);

    public void linkNearbyDuplicatesOptimized(String reportId) {
        // Keep the database transaction short: external AI calls and retry waits must
        // never retain a Hikari connection under load.
        DuplicateContext initialContext = self.loadDuplicateContext(reportId);
        if (initialContext == null) {
            return;
        }
        Report report = initialContext.report();

        // 1. Gemini'dan embedding al (retry ile). Missing optional AI
        // configuration is an expected operating mode, not a per-report warning.
        boolean duplicateAiAvailable = geminiService.isDuplicateDetectionAvailable();
        double[] embedding = duplicateAiAvailable
                ? getEmbeddingWithRetry(report.getTitle(), report.getDescription())
                : null;
        if (embedding == null) {
            if (duplicateAiAvailable) {
                long failureCount = embeddingFailureCount.incrementAndGet();
                log.warn("Embedding üretilemedi (toplam başarısızlık: {}), konum tabanlı fallback akışı devreye alınıyor: reportId={}",
                        failureCount, reportId);
            } else {
                log.debug("Duplicate AI yapılandırılmadı; konum tabanlı fallback kullanılıyor: reportId={}", reportId);
            }
            linkNearbyDuplicates(initialContext);
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

            // Kesin eşleşme threshold'u: strictThreshold (Direct Auto-Link, LLM çağrısı yok)
            java.util.List<Report> strictMatches = reportRepository.findSemanticNearbyInMunicipality(
                    report.getLocation().getY(),
                    report.getLocation().getX(),
                    radius,
                    report.getMunicipality().getId(),
                    reportId,
                    categoryId,
                    embeddingString,
                    strictThreshold,
                    10
            );

            if (!strictMatches.isEmpty()) {
                log.info("Semantik kesin eşleşmeler (Auto-Link) bulundu. Adet={}", strictMatches.size());
                duplicatesToLink.addAll(strictMatches);
            } else {
                // Sınırda eşleşme threshold'u: borderlineThreshold (LLM ile doğrulama gerekir)
                java.util.List<Report> borderlineMatches = reportRepository.findSemanticNearbyInMunicipality(
                        report.getLocation().getY(),
                        report.getLocation().getX(),
                        radius,
                        report.getMunicipality().getId(),
                        reportId,
                        categoryId,
                        embeddingString,
                        borderlineThreshold,
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
                self.persistDuplicateGroupId(reportIdsToUpdate, groupId);
            }
        } catch (HttpClientErrorException e) {
            semanticSearchFailureCount.incrementAndGet();
            if (e.getStatusCode().value() == 429) {
                rateLimitHitCount.incrementAndGet();
                log.error("Gemini API 429 Rate Limit aşıldı (toplam: {}). Konum tabanlı fallback aktif. reportId={}",
                        rateLimitHitCount.get(), reportId);
            } else {
                log.warn("Gemini API istemci hatası (HTTP {}): reportId={}, mesaj={}",
                        e.getStatusCode().value(), reportId, e.getMessage());
            }
            linkNearbyDuplicates(initialContext);
        } catch (HttpServerErrorException e) {
            semanticSearchFailureCount.incrementAndGet();
            log.error("Gemini API sunucu hatası (HTTP {}): reportId={}, mesaj={}",
                    e.getStatusCode().value(), reportId, e.getMessage());
            linkNearbyDuplicates(initialContext);
        } catch (Exception e) {
            semanticSearchFailureCount.incrementAndGet();
            log.warn("pgvector/Embedding araması başarısız oldu (toplam hata: {}), konum tabanlı fallback akışı devreye alınıyor: reportId={}, hata={}",
                    semanticSearchFailureCount.get(), reportId, e.getMessage());
            linkNearbyDuplicates(initialContext);
        }
    }

    public void linkNearbyDuplicates(String reportId) {
        DuplicateContext ctx = self.loadDuplicateContext(reportId);
        if (ctx == null || ctx.nearby().isEmpty()) {
            return;
        }

        linkNearbyDuplicates(ctx);
    }

    private void linkNearbyDuplicates(DuplicateContext ctx) {
        if (ctx.nearby().isEmpty()) {
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
            reportIdsToUpdate.add(ctx.report().getId());
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

    /**
     * Gemini embedding API çağrısını exponential backoff ile yeniden dener.
     * 429 (Rate Limit) ve 503 (Service Unavailable) hatalarında bekleme süresi artarak tekrar dener.
     */
    private double[] getEmbeddingWithRetry(String title, String description) {
        if (!geminiService.isDuplicateDetectionAvailable()) {
            return null;
        }

        long backoffMs = 500;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                double[] result = geminiService.getEmbedding(title, description);
                if (isValidEmbedding(result)) {
                    return result;
                }
                // A null result is a fail-soft signal, not a transient transport
                // failure. Retrying it only occupies async workers under load.
                return null;
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode().value() == 429) {
                    rateLimitHitCount.incrementAndGet();
                    if (attempt >= maxRetries) {
                        log.warn("Gemini embedding 429 Rate Limit (son deneme {}/{}).", attempt, maxRetries);
                        break;
                    }
                    log.warn("Gemini embedding 429 Rate Limit (deneme {}/{}). {}ms sonra tekrar denenecek.",
                            attempt, maxRetries, backoffMs);
                    if (!sleepQuietly(backoffMs)) {
                        return null;
                    }
                    backoffMs = Math.min(backoffMs * 2, 8000);
                    continue;
                }
                log.warn("Gemini embedding istemci hatası (HTTP {}, deneme {}/{}): {}",
                        e.getStatusCode().value(), attempt, maxRetries, e.getMessage());
                return null;
            } catch (HttpServerErrorException e) {
                if (e.getStatusCode().value() == 503 || e.getStatusCode().value() == 500) {
                    if (attempt >= maxRetries) {
                        log.warn("Gemini embedding sunucu hatası (HTTP {}, son deneme {}/{}).",
                                e.getStatusCode().value(), attempt, maxRetries);
                        break;
                    }
                    log.warn("Gemini embedding sunucu hatası (HTTP {}, deneme {}/{}). {}ms sonra tekrar denenecek.",
                            e.getStatusCode().value(), attempt, maxRetries, backoffMs);
                    if (!sleepQuietly(backoffMs)) {
                        return null;
                    }
                    backoffMs = Math.min(backoffMs * 2, 8000);
                    continue;
                }
                log.warn("Gemini embedding sunucu hatası (HTTP {}, deneme {}/{}): {}",
                        e.getStatusCode().value(), attempt, maxRetries, e.getMessage());
                return null;
            } catch (Exception e) {
                log.warn("Gemini embedding beklenmeyen hata (deneme {}/{}): {}",
                        attempt, maxRetries, e.getMessage());
                return null;
            }
        }
        return null;
    }

    private static boolean isValidEmbedding(double[] embedding) {
        if (embedding == null || embedding.length == 0) {
            return false;
        }
        for (double value : embedding) {
            if (!Double.isFinite(value)) {
                return false;
            }
        }
        return true;
    }

    private boolean sleepQuietly(long ms) {
        try {
            Thread.sleep(ms);
            return true;
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** Hata metriklerine erişim (monitoring/actuator amaçlı). */
    public long getEmbeddingFailureCount() { return embeddingFailureCount.get(); }
    public long getSemanticSearchFailureCount() { return semanticSearchFailureCount.get(); }
    public long getRateLimitHitCount() { return rateLimitHitCount.get(); }
}
