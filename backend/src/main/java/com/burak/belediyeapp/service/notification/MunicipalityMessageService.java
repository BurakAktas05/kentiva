package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.Municipality;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Belediye markasına göre SMS / push metinlerini üretir.
 * Şablonda yer tutucular: {belediye}, {baslik}, {not}, {slogan}
 */
@Service
public class MunicipalityMessageService {

    private static final String DEFAULT_SMS_RESOLVED =
            "{belediye}: Sayın vatandaşımız, \"{baslik}\" başlıklı bildiriminiz çözüme kavuşturulmuştur.{not}{slogan}";

    private static final String DEFAULT_PUSH_REJECTED_TITLE = "{belediye} — Bildirim sonucu";
    private static final String DEFAULT_PUSH_REJECTED_BODY =
            "\"{baslik}\" başlıklı bildiriminiz değerlendirilmiş ve reddedilmiştir.{not}";

    private static final String DEFAULT_PUSH_RESOLVED_TITLE = "{belediye} — Bildiriminiz Çözüldü";
    private static final String DEFAULT_PUSH_RESOLVED_BODY =
            "\"{baslik}\" başlıklı bildiriminiz çözüme kavuşturulmuştur.{not}";


    private static final String DEFAULT_SMS_PROCESSING =
            "{belediye}: \"{baslik}\" başlıklı bildiriminiz incelemeye alınmıştır.{not}{slogan}";

    private static final String DEFAULT_PUSH_PROCESSING_TITLE = "{belediye} — Raporunuz incelemeye alındı";
    private static final String DEFAULT_PUSH_PROCESSING_BODY =
            "\"{baslik}\" başlıklı raporunuz incelemeye alındı.{not}";

    private static final String DEFAULT_SMS_ASSIGNED =
            "{belediye}: Size \"{baslik}\" başlıklı yeni bir saha görevi atandı.{not}";

    private static final String DEFAULT_PUSH_ASSIGNED_TITLE = "{belediye} — Yeni görev";
    private static final String DEFAULT_PUSH_ASSIGNED_BODY =
            "\"{baslik}\" başlıklı rapor size atandı.{not}";

    public String buildResolvedSms(Municipality municipality, String reportTitle, String staffNote) {
        return buildResolvedSms(municipality, reportTitle, staffNote, "tr");
    }

    public String buildResolvedSms(Municipality municipality, String reportTitle, String staffNote, String contentLanguage) {
        if (!"tr".equals(ReportLanguageMessages.normalizeLang(contentLanguage))) {
            return ReportLanguageMessages.resolvedSms(
                    contentLanguage, resolveLabel(municipality), truncate(reportTitle, 70), staffNote);
        }
        String template = pickTemplate(municipality != null ? municipality.getSmsResolvedTemplate() : null, DEFAULT_SMS_RESOLVED);
        return render(template, municipality, reportTitle, staffNote);
    }

    public String buildProcessingSms(Municipality municipality, String reportTitle, String staffNote) {
        return buildProcessingSms(municipality, reportTitle, staffNote, "tr");
    }

    public String buildProcessingSms(Municipality municipality, String reportTitle, String staffNote, String contentLanguage) {
        if (!"tr".equals(ReportLanguageMessages.normalizeLang(contentLanguage))) {
            return ReportLanguageMessages.processingSms(
                    contentLanguage, resolveLabel(municipality), truncate(reportTitle, 70), staffNote);
        }
        String template = pickTemplate(
                municipality != null ? municipality.getSmsProcessingTemplate() : null, DEFAULT_SMS_PROCESSING);
        return render(template, municipality, reportTitle, staffNote);
    }

    public PushMessage buildProcessingPush(Municipality municipality, String reportTitle, String staffNote) {
        return buildProcessingPush(municipality, reportTitle, staffNote, "tr");
    }

    public PushMessage buildProcessingPush(
            Municipality municipality, String reportTitle, String staffNote, String contentLanguage) {
        if (!"tr".equals(ReportLanguageMessages.normalizeLang(contentLanguage))) {
            String name = resolveLabel(municipality);
            return new PushMessage(
                    ReportLanguageMessages.processingPushTitle(contentLanguage, name),
                    ReportLanguageMessages.processingPushBody(contentLanguage, truncate(reportTitle, 70), staffNote));
        }
        String titleTpl = pickTemplate(
                municipality != null ? municipality.getPushProcessingTitleTemplate() : null,
                DEFAULT_PUSH_PROCESSING_TITLE);
        String bodyTpl = pickTemplate(
                municipality != null ? municipality.getPushProcessingBodyTemplate() : null,
                DEFAULT_PUSH_PROCESSING_BODY);
        return new PushMessage(
                render(titleTpl, municipality, reportTitle, staffNote),
                render(bodyTpl, municipality, reportTitle, staffNote));
    }

    public String buildAssignedSms(Municipality municipality, String reportTitle, String staffNote) {
        String template = pickTemplate(
                municipality != null ? municipality.getSmsAssignedTemplate() : null, DEFAULT_SMS_ASSIGNED);
        return render(template, municipality, reportTitle, staffNote);
    }

    public PushMessage buildAssignedPush(Municipality municipality, String reportTitle, String staffNote) {
        String titleTpl = pickTemplate(
                municipality != null ? municipality.getPushAssignedTitleTemplate() : null,
                DEFAULT_PUSH_ASSIGNED_TITLE);
        String bodyTpl = pickTemplate(
                municipality != null ? municipality.getPushAssignedBodyTemplate() : null,
                DEFAULT_PUSH_ASSIGNED_BODY);
        return new PushMessage(
                render(titleTpl, municipality, reportTitle, staffNote),
                render(bodyTpl, municipality, reportTitle, staffNote));
    }

    public PushMessage buildRejectedPush(Municipality municipality, String reportTitle, String staffNote) {
        return buildRejectedPush(municipality, reportTitle, staffNote, "tr");
    }

    public PushMessage buildRejectedPush(
            Municipality municipality, String reportTitle, String staffNote, String contentLanguage) {
        if (!"tr".equals(ReportLanguageMessages.normalizeLang(contentLanguage))) {
            String name = resolveLabel(municipality);
            return new PushMessage(
                    ReportLanguageMessages.rejectedPushTitle(contentLanguage, name),
                    ReportLanguageMessages.rejectedPushBody(contentLanguage, truncate(reportTitle, 70), staffNote));
        }
        String titleTpl = pickTemplate(
                municipality != null ? municipality.getPushRejectedTitleTemplate() : null,
                DEFAULT_PUSH_REJECTED_TITLE);
        String bodyTpl = pickTemplate(
                municipality != null ? municipality.getPushRejectedBodyTemplate() : null,
                DEFAULT_PUSH_REJECTED_BODY);
        return new PushMessage(
                render(titleTpl, municipality, reportTitle, staffNote),
                render(bodyTpl, municipality, reportTitle, staffNote));
    }

    public PushMessage buildOutOfJurisdictionPush(Municipality municipality, String reportTitle, String staffNote) {
        return buildOutOfJurisdictionPush(municipality, reportTitle, staffNote, "tr");
    }

    public PushMessage buildOutOfJurisdictionPush(
            Municipality municipality, String reportTitle, String staffNote, String contentLanguage) {
        if (!"tr".equals(ReportLanguageMessages.normalizeLang(contentLanguage))) {
            String name = resolveLabel(municipality);
            return new PushMessage(
                    name + " — Out of Jurisdiction",
                    "Your report \"" + truncate(reportTitle, 70) + "\" is outside our jurisdiction and has been closed." + ((staffNote != null && !staffNote.isBlank()) ? " Note: " + truncate(staffNote, 100) : ""));
        }
        String titleTpl = "{belediye} — Yetki Alanı Dışı";
        String bodyTpl = "\"{baslik}\" başlıklı bildiriminiz belediyemizin yetki alanı dışında olduğu için kapatılmıştır.{not}";
        return new PushMessage(
                render(titleTpl, municipality, reportTitle, staffNote),
                render(bodyTpl, municipality, reportTitle, staffNote));
    }

    public PushMessage buildResolvedPush(Municipality municipality, String reportTitle, String staffNote) {
        return buildResolvedPush(municipality, reportTitle, staffNote, "tr");
    }

    public PushMessage buildResolvedPush(
            Municipality municipality, String reportTitle, String staffNote, String contentLanguage) {
        if (!"tr".equals(ReportLanguageMessages.normalizeLang(contentLanguage))) {
            String name = resolveLabel(municipality);
            return new PushMessage(
                    ReportLanguageMessages.resolvedPushTitle(contentLanguage, name),
                    ReportLanguageMessages.resolvedPushBody(contentLanguage, truncate(reportTitle, 70), staffNote));
        }
        String titleTpl = pickTemplate(
                municipality != null ? municipality.getPushResolvedTitleTemplate() : null,
                DEFAULT_PUSH_RESOLVED_TITLE);
        String bodyTpl = pickTemplate(
                municipality != null ? municipality.getPushResolvedBodyTemplate() : null,
                DEFAULT_PUSH_RESOLVED_BODY);
        return new PushMessage(
                render(titleTpl, municipality, reportTitle, staffNote),
                render(bodyTpl, municipality, reportTitle, staffNote));
    }


    public String resolveSmsSenderHeader(Municipality municipality) {
        if (municipality != null
                && municipality.getSmsSenderHeader() != null
                && !municipality.getSmsSenderHeader().isBlank()) {
            return municipality.getSmsSenderHeader().trim();
        }
        return null;
    }

    private static String pickTemplate(String custom, String fallback) {
        return custom != null && !custom.isBlank() ? custom.trim() : fallback;
    }

    private static String render(String template, Municipality municipality, String reportTitle, String staffNote) {
        Map<String, String> vars = buildVars(municipality, reportTitle, staffNote);
        String out = template;
        for (Map.Entry<String, String> e : vars.entrySet()) {
            out = out.replace("{" + e.getKey() + "}", e.getValue());
        }
        return out.trim();
    }

    private static Map<String, String> buildVars(Municipality municipality, String reportTitle, String staffNote) {
        String belediye = resolveLabel(municipality);
        String baslik = truncate(reportTitle, 70);
        String not = (staffNote != null && !staffNote.isBlank())
                ? " Not: " + truncate(staffNote, 100)
                : "";
        String slogan = (municipality != null
                && municipality.getSlogan() != null
                && !municipality.getSlogan().isBlank())
                ? " " + truncate(municipality.getSlogan(), 60)
                : "";

        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("belediye", belediye);
        vars.put("baslik", baslik);
        vars.put("not", not);
        vars.put("slogan", slogan);
        return vars;
    }

    private static String resolveLabel(Municipality m) {
        if (m == null) {
            return "Belediyeniz";
        }
        if (m.getDisplayName() != null && !m.getDisplayName().isBlank()) {
            return m.getDisplayName().trim();
        }
        return m.getName();
    }

    private static String truncate(String text, int max) {
        if (text == null || text.isBlank()) {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }

    public record PushMessage(String title, String body) {}
}
