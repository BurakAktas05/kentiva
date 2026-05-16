package com.burak.belediyeapp.service.sms;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * SMS OTP servisi — NetGSM veya Twilio üzerinden SMS gönderir.
 * Provider: "none" → log-only (dev), "netgsm" → NetGSM, "twilio" → Twilio
 */
@Service
@Slf4j
public class SmsOtpService {

    @Value("${app.sms.provider:none}")
    private String provider;

    @Value("${app.sms.netgsm.usercode:}")
    private String netgsmUsercode;

    @Value("${app.sms.netgsm.password:}")
    private String netgsmPassword;

    @Value("${app.sms.netgsm.msgheader:KENTIVA}")
    private String netgsmHeader;

    // OTP depolama: phone → {code, expiry}
    private record OtpEntry(String code, long expiresAt) {}
    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();

    private static final int OTP_EXPIRY_SECONDS = 300; // 5 dakika

    /**
     * OTP oluştur ve SMS gönder.
     * @return true → SMS başarıyla gönderildi (veya dev modda loglandı)
     */
    public boolean sendOtp(String phoneNumber) {
        String code = String.valueOf(100000 + ThreadLocalRandom.current().nextInt(900000));
        long expiresAt = System.currentTimeMillis() + (OTP_EXPIRY_SECONDS * 1000L);
        otpStore.put(normalizePhone(phoneNumber), new OtpEntry(code, expiresAt));

        String message = "Kentiva doğrulama kodunuz: " + code + " (5 dk geçerli)";

        return switch (provider.toLowerCase()) {
            case "netgsm" -> sendViaNetgsm(phoneNumber, message);
            case "twilio" -> sendViaTwilio(phoneNumber, message);
            default -> {
                log.info("SMS (dev modu): {} → {}", phoneNumber, code);
                yield true;
            }
        };
    }

    /**
     * OTP doğrula.
     */
    public boolean verifyOtp(String phoneNumber, String code) {
        OtpEntry entry = otpStore.get(normalizePhone(phoneNumber));
        if (entry == null) return false;
        if (System.currentTimeMillis() > entry.expiresAt()) {
            otpStore.remove(normalizePhone(phoneNumber));
            return false;
        }
        if (entry.code().equals(code)) {
            otpStore.remove(normalizePhone(phoneNumber));
            return true;
        }
        return false;
    }

    private String normalizePhone(String phone) {
        return phone.replaceAll("[^0-9+]", "");
    }

    private boolean sendViaNetgsm(String phone, String message) {
        try {
            // NetGSM XML API
            String xml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <mainbody>
                  <header>
                    <company dession="0">Netgsm</company>
                    <usercode>%s</usercode>
                    <password>%s</password>
                    <type>1:n</type>
                    <msgheader>%s</msgheader>
                  </header>
                  <body>
                    <msg><![CDATA[%s]]></msg>
                    <no>%s</no>
                  </body>
                </mainbody>
                """.formatted(netgsmUsercode, netgsmPassword, netgsmHeader, message, phone);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.netgsm.com.tr/sms/send/xml"))
                    .header("Content-Type", "application/xml; charset=UTF-8")
                    .POST(HttpRequest.BodyPublishers.ofString(xml, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("NetGSM yanıt: {}", response.body());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.error("NetGSM SMS gönderimi başarısız: {}", e.getMessage());
            return false;
        }
    }

    private boolean sendViaTwilio(String phone, String message) {
        // Twilio için basit HTTP API çağrısı
        log.warn("Twilio entegrasyonu henüz aktif değil. SMS loglanıyor: {} → {}", phone, message);
        return true;
    }
}
