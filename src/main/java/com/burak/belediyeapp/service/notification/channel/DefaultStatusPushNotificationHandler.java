package com.burak.belediyeapp.service.notification.channel;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.INotificationRepository;
import com.burak.belediyeapp.service.notification.FirebasePushClient;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Order(100)
@RequiredArgsConstructor
public class DefaultStatusPushNotificationHandler implements ReportStatusNotificationHandler {

    private final INotificationRepository notificationRepository;
    private final FirebasePushClient firebasePushClient;

    @Override
    public boolean supports(ReportStatus status) {
        return status != ReportStatus.PENDING
                && status != ReportStatus.RESOLVED
                && status != ReportStatus.REJECTED;
    }

    @Override
    public void deliver(AppUser reporter, Report report, String staffNote) {
        String statusText = report.getReportStatus() == ReportStatus.PROCESSING
                ? "incelemeye alındı"
                : "güncellendi";

        String bodyText = String.format("'%s' başlıklı raporunuz %s.", report.getTitle(), statusText);
        if (staffNote != null && !staffNote.isBlank()) {
            bodyText += " Not: " + staffNote;
        }

        Municipality m = report.getMunicipality();
        String belediyeLabel = m != null
                ? (m.getDisplayName() != null && !m.getDisplayName().isBlank() ? m.getDisplayName() : m.getName())
                : "Kentiva";
        String title = belediyeLabel + " — Raporunuz " + statusText;

        notificationRepository.save(Notification.builder()
                .user(reporter)
                .title(title)
                .body(bodyText)
                .type("REPORT_STATUS_CHANGED")
                .reportId(report.getId())
                .build());

        firebasePushClient.send(
                reporter.getFcmToken(),
                title,
                bodyText,
                Map.of("reportId", report.getId(), "type", "REPORT_STATUS_CHANGED"));
    }
}
