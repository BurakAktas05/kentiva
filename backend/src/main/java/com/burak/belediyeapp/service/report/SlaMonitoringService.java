package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.INotificationRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.notification.FirebasePushClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SlaMonitoringService {

    private final IReportRepository reportRepository;
    private final IAppUserRepository userRepository;
    private final INotificationRepository notificationRepository;
    private final FirebasePushClient firebasePushClient;

    /**
     * Her saat başı asenkron çalışarak SLA süresi dolmuş ihbarları kontrol eder.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void checkSlaBreaches() {
        log.info("SLA breaches check started...");
        List<ReportStatus> activeStatuses = Arrays.asList(
                ReportStatus.PENDING,
                ReportStatus.PROCESSING,
                ReportStatus.FORWARDED
        );

        List<Report> activeReports = reportRepository.findUnresolvedReportsNotSlaBreached(activeStatuses);
        LocalDateTime now = LocalDateTime.now();

        for (Report report : activeReports) {
            String priority = report.getAiPriority();
            int hoursLimit = getSlaHoursLimit(priority);

            if (report.getCreatedAt().plusHours(hoursLimit).isBefore(now)) {
                report.setSlaBreached(true);
                reportRepository.save(report);
                log.warn("SLA breached for report ID: {} (Tracking: {}). Priority: {}. Created: {}", 
                        report.getId(), report.getTrackingNumber(), priority, report.getCreatedAt());

                if (report.getMunicipality() != null) {
                    sendSlaAlertToManagers(report);
                }
            }
        }
    }

    private int getSlaHoursLimit(String priority) {
        if (priority == null) {
            return 72; // varsayılan Medium SLA
        }
        return switch (priority.toUpperCase()) {
            case "CRITICAL", "HIGH" -> 24;
            case "MEDIUM" -> 72;
            case "LOW" -> 168;
            default -> 72;
        };
    }

    private void sendSlaAlertToManagers(Report report) {
        String municipalityId = report.getMunicipality().getId();
        List<AppUser> admins = userRepository.findAllByRoles_NameAndMunicipalityId("ROLE_ADMIN", municipalityId);
        List<AppUser> managers = userRepository.findAllByRoles_NameAndMunicipalityId("ROLE_DEPT_MANAGER", municipalityId);

        String title = "SLA İhlali Uyarısı";
        String body = String.format("'%s' başlıklı ihbar (%s) çözüm süresini (SLA) aşmıştır!", 
                report.getTitle(), report.getTrackingNumber() != null ? report.getTrackingNumber() : report.getId());

        // Hem adminlere hem birim müdürlerine bildirim yolla
        sendAlertToUserList(admins, report, title, body);
        sendAlertToUserList(managers, report, title, body);
    }

    private void sendAlertToUserList(List<AppUser> users, Report report, String title, String body) {
        for (AppUser user : users) {
            Notification notification = Notification.builder()
                    .user(user)
                    .title(title)
                    .body(body)
                    .type("SLA_ALERT")
                    .reportId(report.getId())
                    .build();
            notificationRepository.save(notification);

            if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                try {
                    firebasePushClient.send(
                            user.getFcmToken(),
                            title,
                            body,
                            Map.of("reportId", report.getId(), "type", "SLA_ALERT")
                    );
                } catch (Exception e) {
                    log.warn("Failed to send SLA breach push notification to user: {}", user.getEmail(), e);
                }
            }
        }
    }
}
