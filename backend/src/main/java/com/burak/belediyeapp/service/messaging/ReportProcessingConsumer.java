package com.burak.belediyeapp.service.messaging;

import com.rabbitmq.client.Channel;
import com.burak.belediyeapp.config.RabbitMqConfig;
import com.burak.belediyeapp.dto.messaging.ReportProcessingMessage;
import com.burak.belediyeapp.security.ApiKeyPrincipal;
import com.burak.belediyeapp.service.report.ReportCreatedEventListener;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportProcessingConsumer {

    private final ReportCreatedEventListener reportCreatedEventListener;

    @RabbitListener(
            queues = RabbitMqConfig.REPORT_PROCESSING_QUEUE,
            ackMode = "MANUAL"
    )
    public void processReport(
            ReportProcessingMessage message,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long tag
    ) throws IOException {
        
        log.info("Mesaj kuyruktan alındı: reportId={}, correlationId={}", message.reportId(), message.correlationId());

        try {
            // Asenkron worker thread için Tenant Context Propagation
            if (message.municipalityId() != null) {
                ApiKeyPrincipal principal = new ApiKeyPrincipal(
                        "ASYNCHRONOUS_WORKER",
                        message.municipalityId(),
                        "Asynchronous Worker",
                        Set.of()
                );
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        principal.getAuthorities()
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }

            // Ağır işlem yüklerini çalıştır
            reportCreatedEventListener.scanAndAnalyzeReportFromQueue(message.reportId());

            // Başarılı Acknowledge
            channel.basicAck(tag, false);
            log.info("Mesaj başarıyla işlendi ve ACK gönderildi: {}", message.reportId());

        } catch (Exception e) {
            log.error("Mesaj işlenirken kritik hata! NACK gönderiliyor. reportId={}", message.reportId(), e);
            
            // requeue = false, böylece sonsuz döngü engellenir ve DLQ'ya yönlendirilir.
            channel.basicNack(tag, false, false);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
