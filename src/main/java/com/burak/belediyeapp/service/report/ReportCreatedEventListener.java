package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.entity.ReportMedia;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.media.MediaGuardClient;
import com.burak.belediyeapp.service.media.MediaGuardClient.ScanResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.client.RestClient;

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

    /** WebSocket opsiyonel — Railway gibi ortamlarda olmayabilir. */
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /** Medya indirmek için basit HTTP istemci — Storage URL'lerinden byte[] çeker. */
    private final RestClient mediaFetcher = RestClient.builder()
            .requestFactory(fetcherFactory())
            .build();

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleReportCreated(ReportCreatedEvent event) {

        // 1. WebSocket push — opsiyonel
        if (messagingTemplate != null) {
            try {
                reportRepository.findByIdForRealtimePush(event.reportId()).ifPresent(report -> {
                    if (report.getMunicipality() == null) return;
                    String topic = "/topic/municipality/" + report.getMunicipality().getId() + "/reports";
                    messagingTemplate.convertAndSend(topic, reportMapper.toResponse(report));
                });
            } catch (Exception e) {
                log.warn("WebSocket push hatası: {}", e.getMessage());
            }
        }

        // 2. Media-guard asenkron tarama — selfie/uygunsuz içerik tespiti
        scanMediaAndAutoRejectIfNeeded(event.reportId());

        // 3. AI analizi — fail-soft
        try {
            reportService.performAiAnalysis(event.reportId());
        } catch (Exception e) {
            log.warn("Rapor AI analizi tamamlanamadı: reportId={}, reason={}", event.reportId(), e.getMessage());
        }
    }

    /**
     * Raporun medya URL'lerini indirip Python media-guard'a taratır.
     * Herhangi bir görüntü reddedilirse rapor otomatik REJECTED yapılır.
     */
    private void scanMediaAndAutoRejectIfNeeded(String reportId) {
        try {
            reportRepository.findById(reportId).ifPresent(report -> {
                if (report.getMediaList() == null || report.getMediaList().isEmpty()) return;

                for (ReportMedia media : report.getMediaList()) {
                    String imageUrl = media.getImageUrl();
                    if (imageUrl == null || imageUrl.isBlank()) continue;

                    byte[] bytes = fetchImageBytes(imageUrl);
                    if (bytes == null || bytes.length == 0) continue;

                    ScanResult result = mediaGuardClient.scan(bytes, "image/jpeg");
                    if (result.rejected()) {
                        String reason = result.reason() != null && !result.reason().isBlank()
                                ? result.reason()
                                : "Uygunsuz fotoğraf içeriği (selfie veya yüz tespiti).";
                        log.warn("Media-guard reddi: reportId={}, reason={}", reportId, reason);
                        reportService.systemRejectReport(reportId, reason);
                        return; // İlk red yeterli, gerisi taranmaz
                    }
                }
            });
        } catch (Exception e) {
            log.warn("Media-guard asenkron tarama hatası (atlanıyor): reportId={}, err={}", reportId, e.getMessage());
        }
    }

    /** Görüntü URL'sinden byte[] çeker; hata varsa null döner. */
    private byte[] fetchImageBytes(String url) {
        try {
            // Yerel path ise (http ile başlamıyorsa) atlıyoruz — doğrudan disk erişimi gerekir
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                log.debug("Yerel dosya yolu media-guard tarafından atlandı: {}", url);
                return null;
            }
            return mediaFetcher.get()
                    .uri(url)
                    .retrieve()
                    .body(byte[].class);
        } catch (Exception e) {
            log.warn("Medya indirilemedi (guard atlandı): url={}, err={}", url, e.getMessage());
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
