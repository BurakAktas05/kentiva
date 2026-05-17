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

    @Async
    public void dispatchReportStatusChanged(
            Municipality municipality,
            Report report,
            ReportStatus oldStatus,
            ReportStatus newStatus,
            String note
    ) {
        if (municipality == null || !municipality.isWebhookEnabled()) {
            return;
        }
        String url = municipality.getWebhookUrl();
        if (url == null || url.isBlank()) {
            return;
        }

        ReportStatusWebhookPayload payload = new ReportStatusWebhookPayload(
                "report.status_changed",
                LocalDateTime.now(),
                municipality.getId(),
                report.getId(),
                oldStatus != null ? oldStatus.name() : null,
                newStatus != null ? newStatus.name() : null,
                report.getTitle(),
                report.getCategory() != null ? report.getCategory().getName() : null,
                report.getDistrict(),
                report.getLocation() != null ? report.getLocation().getY() : null,
                report.getLocation() != null ? report.getLocation().getX() : null,
                note
        );

        try {
            byte[] body = objectMapper.writeValueAsBytes(payload);
            var spec = http.post()
                    .uri(url)
                    .header("Content-Type", "application/json")
                    .header("X-BelediyeApp-Event", payload.event())
                    .body(body);

            String secret = municipality.getWebhookSecret();
            if (secret != null && !secret.isBlank()) {
                spec = spec.header("X-BelediyeApp-Signature", "sha256=" + hmacSha256Hex(secret, body));
            }

            spec.retrieve().toBodilessEntity();
            log.info("Webhook gönderildi: belediye={}, rapor={}", municipality.getId(), report.getId());
        } catch (Exception e) {
            log.warn("Webhook gönderilemedi: belediye={}, rapor={}, hata={}",
                    municipality.getId(), report.getId(), e.getMessage());
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
