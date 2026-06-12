package com.burak.belediyeapp.service.integration;

import com.burak.belediyeapp.dto.response.integration.ReportStatusWebhookPayload;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.entity.WebhookDeliveryLog;
import com.burak.belediyeapp.repository.IWebhookDeliveryLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookDispatchService {

    private final ObjectMapper objectMapper;
    private final MisIntegrationService misIntegrationService;
    private final IWebhookDeliveryLogRepository webhookDeliveryLogRepository;
    private final RestClient http = RestClient.builder().build();

    public void dispatchReportStatusChanged(
            Municipality municipality,
            Report report,
            ReportStatus oldStatus,
            ReportStatus newStatus,
            String note
    ) {
        WebhookDispatchContext ctx = WebhookDispatchContext.statusChanged(
                municipality, report, oldStatus, newStatus, note);
        if (ctx != null) {
            dispatchAsync(ctx);
        }
    }

    public void dispatchReportCreated(Municipality municipality, Report report) {
        WebhookDispatchContext ctx = WebhookDispatchContext.created(municipality, report);
        if (ctx != null) {
            dispatchAsync(ctx);
        }
        // MIS/EBYS entegrasyonu
        misIntegrationService.sendReportToMis(municipality, report);
    }

    public void dispatchReportAssigned(Municipality municipality, Report report, String assigneeId) {
        WebhookDispatchContext ctx = WebhookDispatchContext.assigned(municipality, report, assigneeId);
        if (ctx != null) {
            dispatchAsync(ctx);
        }
    }

    @Async
    @Transactional
    public void dispatchAsync(WebhookDispatchContext ctx) {
        ReportStatusWebhookPayload payload = new ReportStatusWebhookPayload(
                ctx.event(),
                LocalDateTime.now(),
                ctx.municipalityId(),
                ctx.reportId(),
                ctx.oldStatus() != null ? ctx.oldStatus().name() : null,
                ctx.newStatus() != null ? ctx.newStatus().name() : null,
                ctx.title(),
                ctx.categoryName(),
                ctx.district(),
                ctx.latitude(),
                ctx.longitude(),
                ctx.note()
        );

        String payloadStr;
        byte[] body;
        try {
            payloadStr = objectMapper.writeValueAsString(payload);
            body = payloadStr.getBytes(StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Webhook payload serileştirme hatası", e);
            return;
        }

        String signature = null;
        String secret = ctx.webhookSecret();
        if (secret != null && !secret.isBlank()) {
            signature = "sha256=" + hmacSha256Hex(secret, body);
        }

        WebhookDeliveryLog logEntry = WebhookDeliveryLog.builder()
                .municipalityId(ctx.municipalityId())
                .webhookUrl(ctx.webhookUrl())
                .event(ctx.event())
                .payload(payloadStr)
                .signature(signature)
                .status("PENDING")
                .retryCount(0)
                .build();

        logEntry = webhookDeliveryLogRepository.save(logEntry);
        attemptDelivery(logEntry, body);
        webhookDeliveryLogRepository.save(logEntry);
    }

    private void attemptDelivery(WebhookDeliveryLog logEntry, byte[] body) {
        try {
            var spec = http.post()
                    .uri(logEntry.getWebhookUrl())
                    .header("Content-Type", "application/json")
                    .header("X-BelediyeApp-Event", logEntry.getEvent());

            if (logEntry.getSignature() != null) {
                spec = spec.header("X-BelediyeApp-Signature", logEntry.getSignature());
            }

            var responseEntity = spec.body(body).retrieve().toBodilessEntity();
            logEntry.setStatus("SUCCESS");
            logEntry.setStatusCode(responseEntity.getStatusCode().value());
            logEntry.setErrorMessage(null);
            logEntry.setNextAttemptAt(null);
        } catch (RestClientResponseException e) {
            logEntry.setStatusCode(e.getStatusCode().value());
            logEntry.setErrorMessage(e.getResponseBodyAsString());
            handleFailure(logEntry);
        } catch (Exception e) {
            logEntry.setStatusCode(null);
            logEntry.setErrorMessage(e.getMessage());
            handleFailure(logEntry);
        }
    }

    private void handleFailure(WebhookDeliveryLog logEntry) {
        logEntry.setRetryCount(logEntry.getRetryCount() + 1);
        if (logEntry.getRetryCount() >= 5) {
            logEntry.setStatus("FAILED");
            logEntry.setNextAttemptAt(null);
            log.warn("Webhook gönderimi nihai olarak başarısız oldu (max retry): logId={}", logEntry.getId());
        } else {
            int backoffMinutes = 5 * (int) Math.pow(2, logEntry.getRetryCount() - 1);
            logEntry.setNextAttemptAt(LocalDateTime.now().plusMinutes(backoffMinutes));
            logEntry.setStatus("FAILED"); // listed as failed but pending retry
            log.info("Webhook gönderimi başarısız, {} dakika sonra tekrar denenecek: logId={}", backoffMinutes, logEntry.getId());
        }
    }

    @Scheduled(fixedRate = 60000) // Her dakika başarısızları tara
    @Transactional
    public void retryFailedWebhooks() {
        List<WebhookDeliveryLog> pendingRetries = webhookDeliveryLogRepository
                .findByStatusAndNextAttemptAtBeforeAndRetryCountLessThan(
                        "FAILED", LocalDateTime.now(), 5);

        for (WebhookDeliveryLog logEntry : pendingRetries) {
            byte[] body = logEntry.getPayload().getBytes(StandardCharsets.UTF_8);
            attemptDelivery(logEntry, body);
            webhookDeliveryLogRepository.save(logEntry);
        }
    }

    private static String hmacSha256Hex(String secret, byte[] body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(body));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC failed", e);
        }
    }
}
