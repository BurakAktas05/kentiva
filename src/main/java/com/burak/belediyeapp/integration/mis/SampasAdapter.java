package com.burak.belediyeapp.integration.mis;

import com.burak.belediyeapp.entity.Report;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Sampaş Kent Bilgi Sistemi entegrasyon adaptörü.
 * SOAP/XML tabanlı ihbar aktarımı yapar.
 */
@Component
@Slf4j
public class SampasAdapter implements MisAdapter {

    private final RestClient http = RestClient.builder().build();

    @Override
    public void sendReport(Report report, String baseUrl, String apiKey) {
        String soapXml = buildSoapEnvelope(report, apiKey);
        try {
            http.post()
                    .uri(baseUrl + "/ws/ihbarServis")
                    .contentType(MediaType.TEXT_XML)
                    .header("SOAPAction", "ihbarEkle")
                    .body(soapXml)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Sampaş MIS ihbar gönderildi: rapor={}", report.getId());
        } catch (Exception e) {
            log.warn("Sampaş MIS gönderilemedi: rapor={}, hata={}", report.getId(), e.getMessage());
        }
    }

    private String buildSoapEnvelope(Report report, String apiKey) {
        return """
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                                  xmlns:kbs="http://sampas.com.tr/kbs">
                  <soapenv:Header>
                    <kbs:AuthHeader><kbs:ApiKey>%s</kbs:ApiKey></kbs:AuthHeader>
                  </soapenv:Header>
                  <soapenv:Body>
                    <kbs:IhbarEkle>
                      <kbs:Baslik>%s</kbs:Baslik>
                      <kbs:Aciklama>%s</kbs:Aciklama>
                      <kbs:Enlem>%s</kbs:Enlem>
                      <kbs:Boylam>%s</kbs:Boylam>
                      <kbs:KaynakSistem>Kentiva</kbs:KaynakSistem>
                      <kbs:DisRaporId>%s</kbs:DisRaporId>
                    </kbs:IhbarEkle>
                  </soapenv:Body>
                </soapenv:Envelope>
                """.formatted(
                escapeXml(apiKey),
                escapeXml(report.getTitle()),
                escapeXml(report.getDescription()),
                report.getLocation() != null ? report.getLocation().getY() : "",
                report.getLocation() != null ? report.getLocation().getX() : "",
                escapeXml(report.getId())
        );
    }

    private static String escapeXml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }
}
