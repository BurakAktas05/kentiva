package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.INotificationRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.notification.MunicipalityMessageService.PushMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Bildirim facade: vatandaş durum bildirimleri {@link CitizenNotificationDispatcher} üzerinden.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final INotificationRepository notificationRepository;
    private final IReportRepository reportRepository;
    private final IAppUserRepository userRepository;
    private final CitizenNotificationDispatcher citizenNotificationDispatcher;
    private final FirebasePushClient firebasePushClient;
    private final MunicipalityMessageService municipalityMessageService;

    /** Self-call yapan @Transactional metotları proxy üzerinden tetiklemek için. */
    @Autowired
    @Lazy
    private NotificationService self;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyReportStatusChanged(Report report) {
        citizenNotificationDispatcher.dispatchReportStatusChanged(report);
    }

    /**
     * @Async + detached entity = LAZY proxy hatası riskini önlemek için
     *   raporu ve assignee'yi ID üzerinden yeni transaction'da YENİDEN çekiyoruz.
     *   FCM push gönderimi DB txn dışında, kayıt commit edildikten sonra yapılır.
     */
    @Async
    public void notifyReportAssigned(Report report, AppUser assignee) {
        AssignedSnapshot snap = self.persistAssignedNotification(
                report != null ? report.getId() : null,
                assignee != null ? assignee.getId() : null);
        if (snap == null) {
            return;
        }
        // Push gönderimi txn dışında — DB connection bekletilmez.
        firebasePushClient.send(
                snap.fcmToken(),
                snap.title(),
                snap.body(),
                Map.of("reportId", snap.reportId(), "type", "REPORT_ASSIGNED"));
    }

    public record AssignedSnapshot(String reportId, String fcmToken, String title, String body) {}

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AssignedSnapshot persistAssignedNotification(String reportId, String assigneeId) {
        if (reportId == null || assigneeId == null) {
            return null;
        }
        Report fresh = reportRepository.findByIdWithMunicipality(reportId).orElse(null);
        AppUser user = userRepository.findById(assigneeId).orElse(null);
        if (fresh == null || user == null) {
            log.warn("notifyReportAssigned: rapor veya kullanıcı bulunamadı (report={}, user={})",
                    reportId, assigneeId);
            return null;
        }
        PushMessage push = municipalityMessageService.buildAssignedPush(
                fresh.getMunicipality(), fresh.getTitle(), null);

        Notification notification = Notification.builder()
                .user(user)
                .title(push.title())
                .body(push.body())
                .type("REPORT_ASSIGNED")
                .reportId(fresh.getId())
                .build();

        notificationRepository.save(notification);
        return new AssignedSnapshot(fresh.getId(), user.getFcmToken(), push.title(), push.body());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional(readOnly = true)
    public Page<Notification> getNotifications(String userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    @Transactional
    public void notifyUserSuspended(AppUser user, String reason, int durationDays) {
        String title = "Hesabınız Askıya Alındı";
        String body = String.format("Hesabınız %d gün süreyle askıya alınmıştır. Gerekçe: %s", durationDays, reason);

        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .body(body)
                .type("USER_SUSPENDED")
                .build();

        notificationRepository.save(notification);

        if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
            try {
                firebasePushClient.send(
                        user.getFcmToken(),
                        title,
                        body,
                        java.util.Map.of("type", "USER_SUSPENDED"));
            } catch (Exception e) {
                log.warn("Askıya alma push bildirimi gönderilemedi: {}", e.getMessage());
            }
        }
    }
}
