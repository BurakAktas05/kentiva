package com.burak.belediyeapp.service.report;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;

@Service
@Slf4j
public class QrCodeService {

    /**
     * Public marketing / tracking site (QR links). Falls back to APP_PUBLIC_URL.
     * Prefer APP_PUBLIC_SITE_URL=https://www.kentiva.app in production.
     */
    @Value("${app.public-site-url:${app.public-base-url:http://localhost:5174}}")
    private String publicSiteUrl;

    public String generateQrCodeBase64(String trackingNumber) {
        if (trackingNumber == null || trackingNumber.isBlank()) {
            return null;
        }
        try {
            String base = publicSiteUrl == null || publicSiteUrl.isBlank()
                    ? "http://localhost:5174"
                    : publicSiteUrl.replaceAll("/+$", "");
            String trackingUrl = base + "/reports/track/" + trackingNumber;
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(trackingUrl, BarcodeFormat.QR_CODE, 250, 250);

            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            byte[] pngData = pngOutputStream.toByteArray();
            return Base64.getEncoder().encodeToString(pngData);
        } catch (Exception e) {
            log.error("Failed to generate QR code for tracking number: {}", trackingNumber, e);
            return null;
        }
    }
}
