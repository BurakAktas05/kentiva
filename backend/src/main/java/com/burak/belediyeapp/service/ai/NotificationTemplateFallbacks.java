package com.burak.belediyeapp.service.ai;

import com.burak.belediyeapp.dto.request.municipality.GenerateNotificationTemplateRequest.NotificationTemplateKind;

/**
 * Gemini kullanılamadığında kullanılan yer tutuculu şablon metinleri.
 */
public final class NotificationTemplateFallbacks {

    private NotificationTemplateFallbacks() {}

    public static String forKind(NotificationTemplateKind kind, String municipalityDisplayName) {
        String b = municipalityDisplayName != null && !municipalityDisplayName.isBlank()
                ? municipalityDisplayName
                : "Belediyemiz";
        return switch (kind) {
            case SMS_RESOLVED ->
                    "{belediye}: {baslik} bildiriminiz çözüldü. Detay: {not}. {slogan}".replace("{belediye}", b);
            case SMS_PROCESSING -> "{belediye}: {baslik} bildiriminiz işleme alındı.";
            case SMS_ASSIGNED -> "{belediye}: {baslik} saha ekibine atandı.";
            case PUSH_REJECTED_TITLE -> "Bildiriminiz değerlendirilemedi";
            case PUSH_REJECTED_BODY -> "{belediye}: {baslik} — {not}";
            case PUSH_PROCESSING_TITLE -> "İhbarınız işleniyor";
            case PUSH_PROCESSING_BODY -> "{belediye}: {baslik} üzerinde çalışılıyor.";
            case PUSH_ASSIGNED_TITLE -> "Saha ekibi yönlendirildi";
            case PUSH_ASSIGNED_BODY -> "{belediye}: {baslik} için ekip atandı.";
        };
    }
}
