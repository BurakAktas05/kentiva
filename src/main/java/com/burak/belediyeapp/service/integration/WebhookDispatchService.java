package com.burak.belediyeapp.service.integration;

import com.burak.belediyeapp.dto.response.integration.ReportStatusWebhookPayload;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookDispatchService {

    private final ObjectMapper objectMapper;
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
    }

    public void dispatchReportAssigned(Municipality municipality, Report report, String assigneeId) {
        WebhookDispatchContext ctx = WebhookDispatchContext.assigned(municipality, report, assigneeId);
        if (ctx != null) {
            dispatchAsync(ctx);
        }
    }

    @Async
    void dispatchAsync(WebhookDispatchContext ctx) {
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

        try {
            byte[] body = objectMapper.writeValueAsBytes(payload);
            var spec = http.post()
                    .uri(ctx.webhookUrl())
                    .header("Content-Type", "application/json")
                    .header("X-BelediyeApp-Event", payload.event())
                    .body(body);

            String secret = ctx.webhookSecret();
            if (secret != null && !secret.isBlank()) {
                spec = spec.header("X-BelediyeApp-Signature", "sha256=" + hmacSha256Hex(secret, body));
            }

            spec.retrieve().toBodilessEntity();
            log.info("Webhook gönderildi: event={}, belediye={}, rapor={}",
                    ctx.event(), ctx.municipalityId(), ctx.reportId());
        } catch (Exception e) {
            log.warn("Webhook gönderilemedi: event={}, belediye={}, rapor={}, hata={}",
                    ctx.event(), ctx.municipalityId(), ctx.reportId(), e.getMessage());
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
