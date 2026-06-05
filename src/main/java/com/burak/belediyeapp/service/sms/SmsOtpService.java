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
import java.util.concurrent.atomic.AtomicInteger;

/**
 * SMS OTP servisi — NetGSM veya Twilio üzerinden SMS gönderir.
 * Provider: "none" → log-only (dev), "netgsm" → NetGSM, "twilio" → Twilio
 *
 * Güvenlik:
 *   • OTP gövdesi log'a yazılmaz (kod sızıntısı önleme).
 *   • Telefon başına gönderim cooldown ve maks. günlük gönderim sınırı vardır.
 *   • Doğrulama hatalarında telefon başına deneme sayacı uygulanır.
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

    /** Aynı numaraya iki OTP arası minimum bekleme (sn). */
    @Value("${app.sms.otp.cooldown-seconds:60}")
    private int cooldownSeconds;

    /** 24 saatlik pencerede aynı numara için maks. OTP gönderim sayısı. */
    @Value("${app.sms.otp.daily-max:5}")
    private int dailyMaxSends;

    /** Maks. başarısız doğrulama; aşıldıktan sonra OTP iptal edilir. */
    @Value("${app.sms.otp.max-attempts:5}")
    private int maxVerifyAttempts;

    private record OtpEntry(String code, long expiresAt, AtomicInteger attempts) {}

    private record SendThrottle(long lastSentAt, int sentInWindow, long windowStartAt) {}

    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();
    private final Map<String, SendThrottle> throttleStore = new ConcurrentHashMap<>();

    private static final int OTP_EXPIRY_SECONDS = 300;       // 5 dakika
    private static final long DAILY_WINDOW_MS = 24L * 60 * 60 * 1000;

    /**
     * OTP oluştur ve SMS gönder.
     *
     * @return true → SMS başarıyla gönderildi (veya dev modda loglandı)
     *         false → throttling tarafından engellendi, sağlayıcı hatası veya geçersiz numara
     */
    public boolean sendOtp(String phoneNumber) {
        String normalized = normalizePhone(phoneNumber);
        if (normalized.isEmpty()) {
            return false;
        }
        if (!consumeSendThrottle(normalized)) {
            log.warn("OTP gönderimi throttle nedeniyle engellendi: {}", maskPhone(normalized));
            return false;
        }
        String code = String.valueOf(100000 + ThreadLocalRandom.current().nextInt(900000));
        long expiresAt = System.currentTimeMillis() + (OTP_EXPIRY_SECONDS * 1000L);
        otpStore.put(normalized, new OtpEntry(code, expiresAt, new AtomicInteger(0)));

        String message = "Kentiva doğrulama kodunuz: " + code + " (5 dk geçerli)";
        // sendInternal OTP içeriğini log'a yazmamak için ayrı yol kullanır
        return sendInternal(phoneNumber, message, null, true);
    }

    /**
     * Bilgilendirme SMS'i (ihbar çözüldü vb.) — OTP değil.
     */
    public boolean sendNotification(String phoneNumber, String message) {
        return sendNotification(phoneNumber, message, null);
    }

    /**
     * @param msgHeaderOverride NetGSM gönderici adı (belediye markası); null ise global başlık
     */
    public boolean sendNotification(String phoneNumber, String message, String msgHeaderOverride) {
        return sendInternal(phoneNumber, message, msgHeaderOverride, false);
    }

    private boolean sendInternal(String phoneNumber, String message,
                                 String msgHeaderOverride, boolean otpBody) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            log.debug("SMS atlandı: telefon numarası yok");
            return false;
        }
        if (message == null || message.isBlank()) {
            return false;
        }
        String formatted = formatPhoneForSms(phoneNumber);
        String header = (msgHeaderOverride != null && !msgHeaderOverride.isBlank())
                ? msgHeaderOverride.trim()
                : netgsmHeader;
        return switch (provider.toLowerCase()) {
            case "netgsm" -> {
                try {
                    yield sendViaNetgsm(formatted, message, header, otpBody);
                } catch (Exception e) {
                    log.error("NetGSM SMS gönderim hatası (tüm denemeler bitti): {}", e.getMessage());
                    yield false;
                }
            }
            case "twilio" -> sendViaTwilio(formatted, message, otpBody);
            default -> {
                // OTP yi log'a YAZMA — sadece teslimat olayını kaydet.
                if (otpBody) {
                    log.info("SMS (dev modu) [{}]: {} → OTP (gövde gizli)", header, maskPhone(formatted));
                } else {
                    log.info("SMS (dev modu) [{}]: {} → {}",
                            header, maskPhone(formatted), truncateForLog(message));
                }
                yield true;
            }
        };
    }

    /**
     * OTP doğrula. Yanlış kod denemesi artar; üst sınırı aşan numaranın OTP'si iptal edilir.
     */
    public boolean verifyOtp(String phoneNumber, String code) {
        String normalized = normalizePhone(phoneNumber);
        OtpEntry entry = otpStore.get(normalized);
        if (entry == null) return false;
        if (System.currentTimeMillis() > entry.expiresAt()) {
            otpStore.remove(normalized);
            return false;
        }
        if (entry.code().equals(code)) {
            otpStore.remove(normalized);
            return true;
        }
        int used = entry.attempts().incrementAndGet();
        if (used >= maxVerifyAttempts) {
            otpStore.remove(normalized);
            log.warn("OTP deneme limiti aşıldı, kod iptal edildi: {}", maskPhone(normalized));
        }
        return false;
    }

    /**
     * Telefon başına cooldown + günlük gönderim limitini değerlendirir.
     * Başarılı olursa sayacı işler ve {@code true} döner.
     */
    private boolean consumeSendThrottle(String normalizedPhone) {
        long now = System.currentTimeMillis();
        SendThrottle next = throttleStore.compute(normalizedPhone, (k, existing) -> {
            if (existing == null) {
                return new SendThrottle(now, 1, now);
            }
            if (now - existing.lastSentAt() < cooldownSeconds * 1000L) {
                return existing; // değişiklik yok — cooldown ihlali
            }
            long windowStart = existing.windowStartAt();
            int count = existing.sentInWindow();
            if (now - windowStart >= DAILY_WINDOW_MS) {
                windowStart = now;
                count = 0;
            }
            if (count >= dailyMaxSends) {
                return existing; // günlük tavan
            }
            return new SendThrottle(now, count + 1, windowStart);
        });
        // Sayaç ilerlemediyse engellendik
        return next.lastSentAt() == now;
    }

    private String normalizePhone(String phone) {
        if (phone == null) return "";
        return phone.replaceAll("[^0-9+]", "");
    }

    /** NetGSM için 90XXXXXXXXXX formatı */
    String formatPhoneForSms(String phone) {
        String digits = normalizePhone(phone).replace("+", "");
        if (digits.startsWith("00")) {
            digits = digits.substring(2);
        }
        if (digits.startsWith("0") && digits.length() == 11) {
            digits = "9" + digits;
        }
        if (!digits.startsWith("90") && digits.length() == 10) {
            digits = "90" + digits;
        }
        return digits;
    }

    private static String truncateForLog(String message) {
        return message.length() <= 80 ? message : message.substring(0, 80) + "…";
    }

    /** Telefon numarasının orta basamaklarını gizler — log'larda PII korunsun diye. */
    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "***";
        int last = Math.min(2, phone.length() - 1);
        return "***" + phone.substring(phone.length() - last);
    }

    @io.github.resilience4j.retry.annotation.Retry(name = "sms")
    @io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker(name = "sms", fallbackMethod = "fallbackSms")
    boolean sendViaNetgsm(String phone, String message, String msgHeader, boolean otpBody) throws Exception {
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
            """.formatted(netgsmUsercode, netgsmPassword, msgHeader, message, phone);

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.netgsm.com.tr/sms/send/xml"))
                .header("Content-Type", "application/xml; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(xml, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        // NetGSM bazı durumlarda yanıt gövdesi olarak yanlış kullanılırsa OTP'yi geri yansıtabilir;
        // gövde değil, yalnızca durum kodunu ve kısa bir özet logla.
        String snippet = truncateForLog(response.body() != null ? response.body() : "");
        if (otpBody) {
            log.info("NetGSM yanıt {} (OTP gönderimi — gövde gizli) → {}",
                    response.statusCode(), maskPhone(phone));
        } else {
            log.info("NetGSM yanıt {} → {} | snippet={}",
                    response.statusCode(), maskPhone(phone), snippet);
        }
        if (response.statusCode() != 200) {
            throw new RuntimeException("NetGSM HTTP error code: " + response.statusCode());
        }
        return true;
    }

    boolean fallbackSms(String phone, String message, String msgHeader, boolean otpBody, Throwable t) {
        log.warn("NetGSM SMS gönderimi circuit breaker veya hata nedeniyle engellendi/başarısız oldu. Hata: {}", t.getMessage());
        return false;
    }

    private boolean sendViaTwilio(String phone, String message, boolean otpBody) {
        if (otpBody) {
            log.warn("Twilio entegrasyonu henüz aktif değil. OTP loglanmadı: {}", maskPhone(phone));
        } else {
            log.warn("Twilio entegrasyonu henüz aktif değil. SMS loglanıyor: {} → {}",
                    maskPhone(phone), truncateForLog(message));
        }
        return true;
    }
}
