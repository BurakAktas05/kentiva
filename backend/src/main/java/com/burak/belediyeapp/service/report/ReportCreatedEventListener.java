package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.entity.ReportMedia;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.security.SsrfProtectionInterceptor;
import com.burak.belediyeapp.service.media.ImageAnonymizationService;
import com.burak.belediyeapp.service.media.MediaGuardClient;
import com.burak.belediyeapp.service.media.MediaGuardClient.ScanResult;
import com.burak.belediyeapp.service.media.MediaValidationService;
import com.burak.belediyeapp.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.client.RestClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import com.burak.belediyeapp.security.ApiKeyPrincipal;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Rapor olusturulduktan sonra asenkron olarak:
 * 1. WebSocket ile canli haritaya push
 * 2. Medya taramasi
 * 3. Mukerrer ihbar kontrolu
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReportCreatedEventListener {

    private final IReportRepository reportRepository;
    private final IReportMapper reportMapper;
    private final ReportService reportService;
    private final MediaGuardClient mediaGuardClient;
    private final MediaValidationService mediaValidationService;
    private final StorageService storageService;
    private final ReportDuplicateLinkService duplicateLinkService;
    private final ImageAnonymizationService imageAnonymizationService;
    private final com.burak.belediyeapp.service.notification.NotificationService notificationService;
    private final com.burak.belediyeapp.repository.IReportHistoryRepository historyRepository;

    @Value("${app.messaging.rabbit.enabled:false}")
    private boolean rabbitEnabled;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    @Lazy
    private ReportCreatedEventListener self;

    private final RestClient mediaFetcher = RestClient.builder()
            .requestFactory(fetcherFactory())
            .requestInterceptor(new SsrfProtectionInterceptor())
            .build();

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleReportCreated(ReportCreatedEvent event) {
        if (messagingTemplate != null) {
            try {
                self.pushRealtime(event.reportId());
            } catch (Exception e) {
                log.warn("WebSocket push hatasi: {}", e.getMessage());
            }
        }

        try {
            reportRepository.findById(event.reportId()).ifPresent(notificationService::notifyReportStatusChanged);
        } catch (Exception e) {
            log.warn("Pending bildirimi gonderilemedi: reportId={}, err={}", event.reportId(), e.getMessage());
        }

        if (!rabbitEnabled) {
            processWithTenantContext(event);
        }
    }

    /**
     * RabbitMQ kapalı olduğunda veya yayın başarısız olduğunda ağır ihbar işlerini
     * bounded async executor üzerinde, tenant izolasyonunu koruyarak tamamlar.
     */
    public void processWithTenantContext(ReportCreatedEvent event) {
        try {
            if (event.municipalityId() != null) {
                ApiKeyPrincipal principal = new ApiKeyPrincipal(
                        "ASYNCHRONOUS_FALLBACK",
                        event.municipalityId(),
                        "Asynchronous Fallback",
                        Set.of()
                );
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
                );
            }
            scanAndAnalyzeReportFromQueue(event.reportId());
        } catch (Exception e) {
            log.error("Yerel ihbar işleme fallback'i başarısız: reportId={}, err={}",
                    event.reportId(), e.getMessage(), e);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    public void scanAndAnalyzeReportFromQueue(String reportId) {
        try {
            ModerationData modData = self.getModerationData(reportId);
            if (modData.enabled()) {
                scanMediaAndAutoRejectIfNeeded(reportId, modData.urls());
            } else {
                log.info("Media moderation devre disi: reportId={}", reportId);
            }
        } catch (Exception e) {
            log.error("Media moderation hatasi: reportId={}, err={}", reportId, e.getMessage(), e);
            throw new RuntimeException("Media moderation failed", e);
        }

        try {
            duplicateLinkService.linkNearbyDuplicatesOptimized(reportId);
        } catch (Exception e) {
            log.error("Mukerrer ihbar analizi tamamlanamadi: reportId={}, err={}", reportId, e.getMessage(), e);
            throw new RuntimeException("Duplicate analysis failed", e);
        }

        try {
            reportService.performAiAnalysisAsSystem(reportId);
        } catch (Exception e) {
            // AI is best-effort: duplicate/media pipeline already succeeded.
            log.warn("Sistem AI analizi tamamlanamadi: reportId={}, err={}", reportId, e.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void pushRealtime(String reportId) {
        reportRepository.findByIdForRealtimePush(reportId).ifPresent(report -> {
            if (report.getMunicipality() == null) {
                return;
            }
            String topic = "/topic/municipality/" + report.getMunicipality().getId() + "/reports";
            messagingTemplate.convertAndSend(topic, reportMapper.toResponse(report));
        });
    }

    public record ModerationData(boolean enabled, List<String> urls) {}

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public ModerationData getModerationData(String reportId) {
        return reportRepository.findById(reportId)
                .map(report -> {
                    boolean enabled = true;
                    if (report.getMunicipality() != null) {
                        enabled = report.getMunicipality().isAiMediaModerationEnabled();
                    }
                    List<String> urls = new ArrayList<>();
                    if (report.getMediaList() != null) {
                        for (ReportMedia media : report.getMediaList()) {
                            if (media.getImageUrl() != null && !media.getImageUrl().isBlank()) {
                                urls.add(media.getImageUrl());
                            }
                        }
                    }
                    return new ModerationData(enabled, urls);
                })
                .orElseGet(() -> new ModerationData(true, List.of()));
    }

    private void scanMediaAndAutoRejectIfNeeded(String reportId, List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return;
        }
        for (String imageUrl : imageUrls) {
            byte[] bytes = fetchImageBytes(imageUrl);
            if (bytes == null || bytes.length == 0) {
                continue;
            }

            ScanResult result = mediaGuardClient.scan(bytes, "image/jpeg");
            if (result.rejected()) {
                String reason = result.reason() != null && !result.reason().isBlank()
                        ? result.reason()
                        : "Uygunsuz fotograf icerik tespiti.";
                log.warn("Media guard reddi: reportId={}, reason={}", reportId, reason);
                reportService.systemRejectReport(reportId, reason, true);
                return;
            }

            MediaValidationService.ValidationResult geminiResult = mediaValidationService.validateImage(bytes, "image/jpeg");
            if (!geminiResult.safe()) {
                String reason = geminiResult.reason() != null && !geminiResult.reason().isBlank()
                        ? geminiResult.reason()
                        : "Gorsel guvenlik kurallari ihlali (" + geminiResult.code() + ").";
                log.warn("Gemini guvenlik reddi: reportId={}, reason={}, code={}", reportId, reason, geminiResult.code());
                reportService.systemRejectReport(reportId, "[Gorsel Guvenlik] " + reason, true);

                if ("OBSCENITY".equalsIgnoreCase(geminiResult.code())
                        || "VIOLENCE".equalsIgnoreCase(geminiResult.code())
                        || "ILLEGAL".equalsIgnoreCase(geminiResult.code())) {
                    try {
                        reportService.suspendReporterOfReport(reportId);
                    } catch (Exception ex) {
                        log.error("Kullanici hesabi askiya alinamadi: reportId={}, err={}", reportId, ex.getMessage());
                    }
                }
                return;
            }

            try {
                byte[] anonymizedBytes = imageAnonymizationService.anonymize(bytes, "image/jpeg");
                if (anonymizedBytes != null && anonymizedBytes.length > 0 && !Arrays.equals(anonymizedBytes, bytes)) {
                    log.info("KVKK anonymization applied: reportId={}, imageUrl={}", reportId, imageUrl);
                    String newUrl = storageService.uploadBytes(anonymizedBytes, "image/jpeg", "reports", "anonymized.jpg");
                    self.updateMediaUrl(reportId, imageUrl, storageService.persistableStoragePath(newUrl));
                    storageService.deleteFile(imageUrl);
                }
            } catch (Exception e) {
                log.warn("KVKK anonymization failed: reportId={}, err={}", reportId, e.getMessage());
                // Görseli silme — DLQ gerçek retry ile anonimleştirene kadar saklanır.
                // Max retry aşılınca ImageAnonymizationService medyayı KVKK için temizler.
                imageAnonymizationService.recordFailure(reportId, imageUrl, e.getMessage());

                reportRepository.findById(reportId).ifPresent(report -> {
                    historyRepository.save(com.burak.belediyeapp.entity.ReportHistory.builder()
                            .report(report)
                            .oldStatus(report.getReportStatus())
                            .newStatus(report.getReportStatus())
                            .changedBy(null)
                            .note("[SİSTEM] Görsel anonimleştirme geçici olarak başarısız. Yeniden denenecek; ihbar işleme alındı.")
                            .build());
                });
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void removeMediaUrl(String reportId, String imageUrl) {
        reportRepository.findById(reportId).ifPresent(report -> {
            if (report.getMediaList() == null) {
                return;
            }
            boolean removed = report.getMediaList().removeIf(media -> imageUrl.equals(media.getImageUrl()));
            if (removed) {
                reportRepository.save(report);
            }
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateMediaUrl(String reportId, String oldUrl, String newUrl) {
        reportRepository.findById(reportId).ifPresent(report -> {
            if (report.getMediaList() == null) {
                return;
            }
            for (ReportMedia media : report.getMediaList()) {
                if (oldUrl.equals(media.getImageUrl())) {
                    media.setImageUrl(newUrl);
                }
            }
            reportRepository.save(report);
        });
    }

    private byte[] fetchImageBytes(String url) {
        try {
            if (url == null || url.isBlank()) {
                return null;
            }
            if (url.startsWith("http://") || url.startsWith("https://")) {
                return mediaFetcher.get()
                        .uri(url)
                        .retrieve()
                        .body(byte[].class);
            }
            return storageService.downloadFile(url);
        } catch (Exception e) {
            log.warn("Medya indirilemedi: url={}, err={}", url, e.getMessage());
            return null;
        }
    }

    private static SimpleClientHttpRequestFactory fetcherFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(15_000);
        return factory;
    }
}
