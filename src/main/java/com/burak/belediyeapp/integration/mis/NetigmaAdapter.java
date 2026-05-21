package com.burak.belediyeapp.integration.mis;

import com.burak.belediyeapp.entity.Report;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Netcad/Netigma CBS entegrasyon adaptörü.
 * REST/JSON tabanlı ihbar aktarımı yapar.
 */
@Component
@Slf4j
public class NetigmaAdapter implements MisAdapter {

    private final RestClient http = RestClient.builder().build();

    @Override
    public void sendReport(Report report, String baseUrl, String apiKey) {
        Map<String, Object> body = Map.of(
                "source", "Kentiva",
                "externalId", report.getId(),
                "title", report.getTitle() != null ? report.getTitle() : "",
                "description", report.getDescription() != null ? report.getDescription() : "",
                "latitude", report.getLocation() != null ? report.getLocation().getY() : 0,
                "longitude", report.getLocation() != null ? report.getLocation().getX() : 0,
                "category", report.getCategory() != null ? report.getCategory().getName() : ""
        );
        try {
            http.post()
                    .uri(baseUrl + "/api/v1/complaints")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Netigma MIS ihbar gönderildi: rapor={}", report.getId());
        } catch (Exception e) {
            log.warn("Netigma MIS gönderilemedi: rapor={}, hata={}", report.getId(), e.getMessage());
        }
    }
}
