package com.burak.belediyeapp.service.messaging;

import com.burak.belediyeapp.config.RabbitMqConfig;
import com.burak.belediyeapp.dto.messaging.ReportProcessingMessage;
import com.burak.belediyeapp.service.report.ReportCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publishReportCreatedEvent(ReportCreatedEvent event) {
        log.info("İhbar oluşturma commit edildi. Kuyruğa gönderiliyor: reportId={}, tenantId={}", 
                event.reportId(), event.municipalityId());

        ReportProcessingMessage message = new ReportProcessingMessage(
                event.reportId(),
                event.municipalityId(),
                UUID.randomUUID().toString(),
                System.currentTimeMillis()
        );

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMqConfig.REPORT_EXCHANGE,
                    RabbitMqConfig.REPORT_PROCESSING_ROUTING_KEY,
                    message
            );
        } catch (Exception e) {
            log.error("RabbitMQ mesaj gönderim hatası (reportId={}): {}", event.reportId(), e.getMessage(), e);
        }
    }
}
