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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SlaMonitoringService {

    private static final int BATCH_SIZE = 200;

    private final IReportRepository reportRepository;
    private final IAppUserRepository userRepository;
    private final INotificationRepository notificationRepository;
    private final FirebasePushClient firebasePushClient;

    @Autowired
    @Lazy
    private SlaMonitoringService self;

    /**
     * Hourly SLA scan. DB writes stay in short transactions; Firebase is outside.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void checkSlaBreaches() {
        log.info("SLA breaches check started...");
        List<ReportStatus> activeStatuses = Arrays.asList(
                ReportStatus.PENDING,
                ReportStatus.PROCESSING,
                ReportStatus.FORWARDED
        );

        LocalDateTime now = LocalDateTime.now();
        int page = 0;
        List<Report> batch;
        do {
            batch = reportRepository.findUnresolvedReportsNotSlaBreached(
                    activeStatuses, PageRequest.of(page, BATCH_SIZE));
            List<String> breachedIds = new ArrayList<>();
            for (Report report : batch) {
                String priority = report.getAiPriority();
                int hoursLimit = getSlaHoursLimit(priority);

                LocalDateTime baseTime = report.getCreatedAt();
                if (report.getReportStatus() == ReportStatus.PROCESSING && report.getProcessedAt() != null) {
                    baseTime = report.getProcessedAt();
                }

                if (baseTime.plusHours(hoursLimit).isBefore(now)) {
                    breachedIds.add(report.getId());
                }
            }
            for (String reportId : breachedIds) {
                Report breached = self.markSlaBreached(reportId);
                if (breached != null && breached.getMunicipality() != null) {
                    sendSlaAlertToManagers(breached);
                }
            }
            page++;
        } while (batch.size() == BATCH_SIZE);
    }

    @Transactional
    public Report markSlaBreached(String reportId) {
        return reportRepository.findByIdForRealtimePush(reportId).map(report -> {
            if (report.isSlaBreached()) {
                return null;
            }
            report.setSlaBreached(true);
            Report saved = reportRepository.save(report);
            log.warn("SLA breached for report ID: {} (Tracking: {}). Priority: {}. Created: {}",
                    report.getId(), report.getTrackingNumber(), report.getAiPriority(), report.getCreatedAt());
            return saved;
        }).orElse(null);
    }

    private int getSlaHoursLimit(String priority) {
        if (priority == null) {
            return 72;
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

        sendAlertToUserList(admins, report, title, body);
        sendAlertToUserList(managers, report, title, body);
    }

    private void sendAlertToUserList(List<AppUser> users, Report report, String title, String body) {
        for (AppUser user : users) {
            self.persistSlaNotification(user.getId(), report.getId(), title, body);

            if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                try {
                    firebasePushClient.send(
                            user.getFcmToken(),
                            title,
                            body,
                            Map.of("reportId", report.getId(), "type", "SLA_ALERT")
                    );
                } catch (Exception e) {
                    log.warn("Failed to send SLA breach push notification to userId={}", user.getId());
                }
            }
        }
    }

    @Transactional
    public void persistSlaNotification(String userId, String reportId, String title, String body) {
        userRepository.findById(userId).ifPresent(user -> {
            Notification notification = Notification.builder()
                    .user(user)
                    .title(title)
                    .body(body)
                    .type("SLA_ALERT")
                    .reportId(reportId)
                    .build();
            notificationRepository.save(notification);
        });
    }
}
