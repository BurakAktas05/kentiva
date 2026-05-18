package com.burak.belediyeapp.service.notification.channel;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.INotificationRepository;
import com.burak.belediyeapp.service.notification.FirebasePushClient;
import com.burak.belediyeapp.service.notification.MunicipalityMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Order(20)
@RequiredArgsConstructor
public class RejectedPushNotificationHandler implements ReportStatusNotificationHandler {

    private final INotificationRepository notificationRepository;
    private final MunicipalityMessageService municipalityMessageService;
    private final FirebasePushClient firebasePushClient;

    @Override
    public boolean supports(ReportStatus status) {
        return status == ReportStatus.REJECTED;
    }

    @Override
    public void deliver(AppUser reporter, Report report, String staffNote) {
        MunicipalityMessageService.PushMessage push = municipalityMessageService.buildRejectedPush(
                report.getMunicipality(), report.getTitle(), staffNote, report.getContentLanguage());

        notificationRepository.save(Notification.builder()
                .user(reporter)
                .title(push.title())
                .body(push.body())
                .type("REPORT_REJECTED")
                .reportId(report.getId())
                .build());

        firebasePushClient.send(
                reporter.getFcmToken(),
                push.title(),
                push.body(),
                Map.of("reportId", report.getId(), "type", "REPORT_REJECTED"));
    }
}
