package com.burak.belediyeapp.service.integration;

import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;

/**
 * Webhook gönderimi için gerekli alanlar — async thread'de lazy Hibernate proxy kullanılmaz.
 */
public record WebhookDispatchContext(
        boolean webhookEnabled,
        String webhookUrl,
        String webhookSecret,
        String municipalityId,
        String reportId,
        String title,
        String categoryName,
        String district,
        Double latitude,
        Double longitude,
        String event,
        ReportStatus oldStatus,
        ReportStatus newStatus,
        String note
) {
    public static WebhookDispatchContext statusChanged(
            Municipality municipality,
            Report report,
            ReportStatus oldStatus,
            ReportStatus newStatus,
            String note
    ) {
        return base(municipality, report, "report.status_changed", oldStatus, newStatus, note);
    }

    public static WebhookDispatchContext created(Municipality municipality, Report report) {
        return base(municipality, report, "report.created", null, ReportStatus.PENDING, null);
    }

    public static WebhookDispatchContext assigned(
            Municipality municipality,
            Report report,
            String assigneeId
    ) {
        String note = assigneeId != null ? "assigneeId=" + assigneeId : null;
        ReportStatus status = report.getReportStatus();
        return base(municipality, report, "report.assigned", status, status, note);
    }

    private static WebhookDispatchContext base(
            Municipality municipality,
            Report report,
            String event,
            ReportStatus oldStatus,
            ReportStatus newStatus,
            String note
    ) {
        if (municipality == null || report == null || !municipality.isWebhookEnabled()) {
            return null;
        }
        String url = municipality.getWebhookUrl();
        if (url == null || url.isBlank()) {
            return null;
        }
        String categoryName = report.getCategory() != null ? report.getCategory().getName() : null;
        Double lat = report.getLocation() != null ? report.getLocation().getY() : null;
        Double lng = report.getLocation() != null ? report.getLocation().getX() : null;
        return new WebhookDispatchContext(
                true,
                url,
                municipality.getWebhookSecret(),
                municipality.getId(),
                report.getId(),
                report.getTitle(),
                categoryName,
                report.getDistrict(),
                lat,
                lng,
                event,
                oldStatus,
                newStatus,
                note
        );
    }
}
