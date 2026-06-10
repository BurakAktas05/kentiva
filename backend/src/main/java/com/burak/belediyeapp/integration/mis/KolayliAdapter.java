package com.burak.belediyeapp.integration.mis;

import com.burak.belediyeapp.entity.Report;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Kolaylı Belediye Yazılımı entegrasyon adaptörü.
 * SOAP/XML tabanlı ihbar aktarımı yapar.
 */
@Component
@Slf4j
public class KolayliAdapter implements MisAdapter {

    private final RestClient http = RestClient.builder().build();

    @Override
    public void sendReport(Report report, String baseUrl, String apiKey) {
        String soapXml = buildSoapEnvelope(report, apiKey);
        try {
            http.post()
                    .uri(baseUrl + "/BelediyeService.asmx")
                    .contentType(MediaType.TEXT_XML)
                    .header("SOAPAction", "http://kolayli.com.tr/BildirimEkle")
                    .body(soapXml)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Kolaylı MIS ihbar gönderildi: rapor={}", report.getId());
        } catch (Exception e) {
            log.warn("Kolaylı MIS gönderilemedi: rapor={}, hata={}", report.getId(), e.getMessage());
        }
    }

    private String buildSoapEnvelope(Report report, String apiKey) {
        return """
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                                  xmlns:kol="http://kolayli.com.tr/">
                  <soapenv:Header>
                    <kol:Credentials><kol:Token>%s</kol:Token></kol:Credentials>
                  </soapenv:Header>
                  <soapenv:Body>
                    <kol:BildirimEkle>
                      <kol:Konu>%s</kol:Konu>
                      <kol:Detay>%s</kol:Detay>
                      <kol:Lat>%s</kol:Lat>
                      <kol:Lng>%s</kol:Lng>
                      <kol:Kaynak>Kentiva</kol:Kaynak>
                      <kol:RefNo>%s</kol:RefNo>
                    </kol:BildirimEkle>
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
