package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Rapor oluşturulduktan sonra asenkron olarak:
 * 1. WebSocket ile canlı haritaya push (varsa)
 * 2. AI analizi tetikle
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReportCreatedEventListener {

    private final IReportRepository reportRepository;
    private final IReportMapper reportMapper;
    private final ReportService reportService;

    /**
     * WebSocket opsiyonel — Railway gibi ortamlarda olmayabilir.
     */
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleReportCreated(ReportCreatedEvent event) {
        // WebSocket push — opsiyonel
        if (messagingTemplate != null) {
            try {
                reportRepository.findById(event.reportId()).ifPresent(report ->
                        messagingTemplate.convertAndSend("/topic/reports", reportMapper.toResponse(report)));
            } catch (Exception e) {
                log.warn("WebSocket push hatası: {}", e.getMessage());
            }
        }

        // AI analizi — fail-soft
        try {
            reportService.performAiAnalysis(event.reportId());
        } catch (Exception e) {
            log.warn("Rapor AI analizi tamamlanamadı: reportId={}, reason={}", event.reportId(), e.getMessage());
        }
    }
}
