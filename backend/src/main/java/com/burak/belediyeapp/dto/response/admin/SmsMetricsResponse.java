package com.burak.belediyeapp.dto.response.admin;

/**
 * SMS gönderim istatistikleri — Süper admin panelinde gösterilir.
 */
public record SmsMetricsResponse(
        /** Aktif SMS sağlayıcısı (none / netgsm / twilio). */
        String provider,
        /** Toplam gönderilen SMS sayısı (uygulama başlangıcından beri). */
        long totalSent,
        /** Başarılı gönderim sayısı. */
        long totalSuccess,
        /** Başarısız gönderim sayısı. */
        long totalFailed,
        /** Son başarısız gönderimin zaman damgası (ISO-8601) — null ise hata yok. */
        String lastFailureAt,
        /** Son başarısız gönderimin hata mesajı. */
        String lastFailureMessage,
        /** OTP gönderim sayısı. */
        long otpSentCount,
        /** Bildirim SMS gönderim sayısı. */
        long notificationSentCount
) {}
