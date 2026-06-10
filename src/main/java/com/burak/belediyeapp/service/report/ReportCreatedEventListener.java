package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportMedia;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IReportRepository;
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
import com.burak.belediyeapp.security.SsrfProtectionInterceptor;

import java.util.ArrayList;
import java.util.List;

/**
 * Rapor oluşturulduktan sonra asenkron olarak:
 * 1. WebSocket ile canlı haritaya push (varsa)
 * 2. Medya guard taraması — selfie/uygunsuz içerik varsa sistem otomatik reddeder
 * 3. AI analizi tetikle
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

    /** WebSocket opsiyonel — Railway gibi ortamlarda olmayabilir. */
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /** Self-call yapan @Transactional metotları proxy üzerinden tetiklemek için. */
    @Autowired
    @Lazy
    private ReportCreatedEventListener self;

    /** Medya indirmek için basit HTTP istemci — Storage URL'lerinden byte[] çeker. */
    private final RestClient mediaFetcher = RestClient.builder()
            .requestFactory(fetcherFactory())
            .requestInterceptor(new SsrfProtectionInterceptor())
            .build();

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleReportCreated(ReportCreatedEvent event) {

        // 1. WebSocket push — opsiyonel.
        // findByIdForRealtimePush JOIN FETCH yapar ama mediaList LAZY kalır;
        // mapper sadece toResponse ile ihtiyaç duyduğu alanları çevirir.
        if (messagingTemplate != null) {
            try {
                self.pushRealtime(event.reportId());
            } catch (Exception e) {
                log.warn("WebSocket push hatası: {}", e.getMessage());
            }
        }

        // 2. Media-guard tarama — selfie/uygunsuz içerik tespiti.
        // Önce yeni bir read-only transaction içinde URL listesini çekeriz
        // (LAZY mediaList sorunu olmasın diye); HTTP indirme ve tarama txn dışında yapılır.
        try {
            List<String> imageUrls = self.collectMediaUrls(event.reportId());
            scanMediaAndAutoRejectIfNeeded(event.reportId(), imageUrls);
        } catch (Exception e) {
            log.warn("Media-guard tarama hatası (atlanıyor): reportId={}, err={}",
                    event.reportId(), e.getMessage());
        }

        // 3. AI analizi — fail-soft, sistem context (kullanıcı oturumu yok).
        try {
            reportService.performAiAnalysisAsSystem(event.reportId());
        } catch (Exception e) {
            log.warn("Rapor AI analizi tamamlanamadı: reportId={}, reason={}", event.reportId(), e.getMessage());
        }
    }

    /** WebSocket push - yeni read-only transaction içinde fetch + map (LAZY proxy korur). */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void pushRealtime(String reportId) {
        reportRepository.findByIdForRealtimePush(reportId).ifPresent(report -> {
            if (report.getMunicipality() == null) return;
            String topic = "/topic/municipality/" + report.getMunicipality().getId() + "/reports";
            messagingTemplate.convertAndSend(topic, reportMapper.toResponse(report));
        });
    }

    /**
     * Yeni bir read-only transaction içinde rapor + mediaList'i çeker
     * ve sadece URL stringlerini dışarı taşır (LAZY proxy detached olmasın diye).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public List<String> collectMediaUrls(String reportId) {
        return reportRepository.findById(reportId)
                .map(Report::getMediaList)
                .map(list -> {
                    List<String> urls = new ArrayList<>(list.size());
                    for (ReportMedia m : list) {
                        if (m.getImageUrl() != null && !m.getImageUrl().isBlank()) {
                            urls.add(m.getImageUrl());
                        }
                    }
                    return urls;
                })
                .orElseGet(List::of);
    }

    /**
     * Görüntüleri indirip media-guard'a taratır — DB txn'i AÇIK DEĞİL.
     * Tek bir reddedilen kayıt yeterlidir; sonraki taramalar atlanır.
     */
    private void scanMediaAndAutoRejectIfNeeded(String reportId, List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return;
        }
        for (String imageUrl : imageUrls) {
            byte[] bytes = fetchImageBytes(imageUrl);
            if (bytes == null || bytes.length == 0) continue;

            ScanResult result = mediaGuardClient.scan(bytes, "image/jpeg");
            if (result.rejected()) {
                String reason = result.reason() != null && !result.reason().isBlank()
                        ? result.reason()
                        : "Uygunsuz fotoğraf içeriği (selfie veya yüz tespiti).";
                log.warn("Media-guard reddi: reportId={}, reason={}", reportId, reason);
                reportService.systemRejectReport(reportId, reason);
                return;
            }

            MediaValidationService.ValidationResult geminiResult = mediaValidationService.validateImage(bytes, "image/jpeg");
            if (!geminiResult.safe()) {
                String reason = geminiResult.reason() != null && !geminiResult.reason().isBlank()
                        ? geminiResult.reason()
                        : "Görsel güvenlik kuralları ihlali (" + geminiResult.code() + ").";
                log.warn("Gemini Safe Search reddi: reportId={}, reason={}, code={}", reportId, reason, geminiResult.code());
                reportService.systemRejectReport(reportId, "[Görsel Güvenlik] " + reason);
                
                if ("OBSCENITY".equalsIgnoreCase(geminiResult.code()) 
                        || "VIOLENCE".equalsIgnoreCase(geminiResult.code()) 
                        || "ILLEGAL".equalsIgnoreCase(geminiResult.code())) {
                    try {
                        reportService.suspendReporterOfReport(reportId);
                    } catch (Exception ex) {
                        log.error("Kullanıcı hesabı askıya alınamadı: reportId={}, err={}", reportId, ex.getMessage());
                    }
                }
                return;
            }
        }
    }    /** Görüntü URL'sinden veya yerel yoldan/S3'ten byte[] okur; hata varsa null döner. */
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
            log.warn("Medya indirilemedi veya okunamadı (guard atlandı): url={}, err={}", url, e.getMessage());
            return null;
        }
    }

    private static SimpleClientHttpRequestFactory fetcherFactory() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(15_000);
        return f;
    }
}
