package com.burak.belediyeapp.service.notification;

/**
 * Vatandaş bildirim metinleri — raporun yazıldığı dile göre.
 */
public final class ReportLanguageMessages {

    private ReportLanguageMessages() {}

    public static String normalizeLang(String lang) {
        if (lang == null || lang.isBlank()) {
            return "tr";
        }
        return switch (lang.toLowerCase()) {
            case "en", "ar" -> lang.toLowerCase();
            default -> "tr";
        };
    }

    public static String processingPushTitle(String lang, String municipalityName) {
        return switch (normalizeLang(lang)) {
            case "en" -> municipalityName + " — Report under review";
            case "ar" -> municipalityName + " — تم استلام بلاغك";
            default -> municipalityName + " — Raporunuz inceleniyor";
        };
    }

    public static String processingPushBody(String lang, String title, String staffNote) {
        String note = formatNote(lang, staffNote);
        return switch (normalizeLang(lang)) {
            case "en" -> "Your report \"" + title + "\" is being reviewed." + note;
            case "ar" -> "بلاغك \"" + title + "\" قيد المراجعة." + note;
            default -> "\"" + title + "\" başlıklı raporunuz inceleniyor." + note;
        };
    }

    public static String resolvedSms(String lang, String municipalityName, String title, String staffNote) {
        String note = formatNote(lang, staffNote);
        return switch (normalizeLang(lang)) {
            case "en" -> municipalityName + ": Your report \"" + title + "\" has been resolved." + note;
            case "ar" -> municipalityName + ": تم حل بلاغك \"" + title + "\"." + note;
            default -> municipalityName + ": \"" + title + "\" başlıklı bildiriminiz çözüldü." + note;
        };
    }

    public static String rejectedPushTitle(String lang, String municipalityName) {
        return switch (normalizeLang(lang)) {
            case "en" -> municipalityName + " — Report update";
            case "ar" -> municipalityName + " — تحديث البلاغ";
            default -> municipalityName + " — Bildirim sonucu";
        };
    }

    public static String rejectedPushBody(String lang, String title, String staffNote) {
        String note = formatNote(lang, staffNote);
        return switch (normalizeLang(lang)) {
            case "en" -> "Your report \"" + title + "\" was reviewed and could not be processed." + note;
            case "ar" -> "تمت مراجعة بلاغك \"" + title + "\" ولم يتم قبوله." + note;
            default -> "\"" + title + "\" başlıklı bildiriminiz değerlendirildi." + note;
        };
    }

    public static String resolvedPushTitle(String lang, String municipalityName) {
        return switch (normalizeLang(lang)) {
            case "en" -> municipalityName + " — Report resolved";
            case "ar" -> municipalityName + " — تم حل بلاغك";
            default -> municipalityName + " — Bildiriminiz Çözüldü";
        };
    }

    public static String resolvedPushBody(String lang, String title, String staffNote) {
        String note = formatNote(lang, staffNote);
        return switch (normalizeLang(lang)) {
            case "en" -> "Your report \"" + title + "\" has been resolved." + note;
            case "ar" -> "تم حل بلاغك \"" + title + "\"." + note;
            default -> "\"" + title + "\" başlıklı bildiriminiz çözüme kavuşturulmuştur." + note;
        };
    }


    public static String municipalActorLabel(String lang) {
        return switch (normalizeLang(lang)) {
            case "en" -> "Municipality";
            case "ar" -> "البلدية";
            default -> "Belediye";
        };
    }

    public static String processingSms(String lang, String municipalityName, String title, String staffNote) {
        String note = formatNote(lang, staffNote);
        return switch (normalizeLang(lang)) {
            case "en" -> municipalityName + ": Your report \"" + title + "\" is under review." + note;
            case "ar" -> municipalityName + ": بلاغك \"" + title + "\" قيد المراجعة." + note;
            default -> municipalityName + ": \"" + title + "\" başlıklı bildiriminiz inceleniyor." + note;
        };
    }

    public static String heuristicReplyDraft(String lang) {
        return heuristicReplyDraft(lang, null);
    }

    public static String heuristicReplyDraft(String lang, com.burak.belediyeapp.entity.ReportStatus targetStatus) {
        String normalized = normalizeLang(lang);
        if (targetStatus == null) {
            return switch (normalized) {
                case "en" -> "Thank you for your report. Our teams are working on it and we will update you as soon as possible.";
                case "ar" -> "شكراً لبلاغكم. فرقنا تعمل على المعالجة وسنبلغكم عند اكتمال الإجراء.";
                default -> "Bildiriminiz için teşekkür ederiz. Ekiplerimiz konuyu değerlendirmektedir; süreç hakkında bilgilendirileceksiniz.";
            };
        }
        return switch (targetStatus) {
            case OUT_OF_JURISDICTION -> switch (normalized) {
                case "en" -> "The reported issue is outside our municipality's jurisdiction. It will be forwarded to the relevant authority.";
                case "ar" -> "الموضوع المبلغ عنه خارج نطاق اختصاص بلديتنا. سيتم توجيهه إلى الجهة المعنية.";
                default -> "Bildirilen konunun belediyemizin yetki alanı dışında kaldığı tespit edilmiştir. İlgili kuruma iletilmesi tavsiye edilir.";
            };
            case RESOLVED -> switch (normalized) {
                case "en" -> "The issue you reported has been successfully resolved by our field teams. Thank you for your contribution.";
                case "ar" -> "تم حل المشكلة التي أبلغت عنها بنجاح من قبل فرقنا الميدانية. شكراً لمساهمتك.";
                default -> "Bildirmiş olduğunuz sorun saha ekiplerimiz tarafından başarıyla giderilmiştir. Katkılarınız için teşekkür ederiz.";
            };
            case PROCESSING -> switch (normalized) {
                case "en" -> "Your report has been reviewed and processed. Our field teams have started working on it.";
                case "ar" -> "تمت مراجعة بلاغك وجاري العمل عليه. بدأت فرقنا الميدانية بالمعالجة.";
                default -> "Bildiriminiz incelenmiş ve işleme alınmıştır. Saha ekiplerimiz çalışmalara başlamıştır.";
            };
            case REJECTED -> switch (normalized) {
                case "en" -> "Your report has been rejected as it does not comply with our platform guidelines or contains insufficient information.";
                case "ar" -> "تم رفض البلاغ لعدم توافقه مع شروط منصتنا أو لعدم كفاية المعلومات.";
                default -> "Bildiriminiz, kurallarımıza uymaması veya yetersiz bilgi içermesi nedeniyle işleme alınamamış ve reddedilmiştir.";
            };
            default -> switch (normalized) {
                case "en" -> "Thank you for your report. Our teams are working on it and we will update you as soon as possible.";
                case "ar" -> "شكراً لبلاغكم. فرقنا تعمل على المعالجة وسنبلغكم عند اكتمال الإجراء.";
                default -> "Bildiriminiz için teşekkür ederiz. Ekiplerimiz konuyu değerlendirmektedir; süreç hakkında bilgilendirileceksiniz.";
            };
        };
    }

    public static String pendingPushTitle(String lang, String municipalityName) {
        return switch (normalizeLang(lang)) {
            case "en" -> municipalityName + " — Report received";
            case "ar" -> municipalityName + " — تم استلام بلاغك";
            default -> municipalityName + " — Raporunuz alındı";
        };
    }

    public static String pendingPushBody(String lang, String title) {
        return switch (normalizeLang(lang)) {
            case "en" -> "Your report \"" + title + "\" has been successfully received.";
            case "ar" -> "تم استلام بلاغك \"" + title + "\" بنجاح.";
            default -> "\"" + title + "\" başlıklı raporunuz başarıyla sisteme alınmıştır.";
        };
    }

    public static String forwardedPushTitle(String lang, String municipalityName) {
        return switch (normalizeLang(lang)) {
            case "en" -> municipalityName + " — Report forwarded";
            case "ar" -> municipalityName + " — تم توجيه بلاغك";
            default -> municipalityName + " — Raporunuz yönlendirildi";
        };
    }

    public static String forwardedPushBody(String lang, String title, String staffNote) {
        String note = formatNote(lang, staffNote);
        return switch (normalizeLang(lang)) {
            case "en" -> "Your report \"" + title + "\" has been forwarded to the relevant department." + note;
            case "ar" -> "تم توجيه بلاغك \"" + title + "\" إلى القسم المختص." + note;
            default -> "\"" + title + "\" başlıklı raporunuz ilgili departmana yönlendirilmiştir." + note;
        };
    }

    private static String formatNote(String lang, String staffNote) {
        if (staffNote == null || staffNote.isBlank()) {
            return "";
        }
        return switch (normalizeLang(lang)) {
            case "en" -> " Note: " + staffNote.trim();
            case "ar" -> " ملاحظة: " + staffNote.trim();
            default -> " Not: " + staffNote.trim();
        };
    }
}
