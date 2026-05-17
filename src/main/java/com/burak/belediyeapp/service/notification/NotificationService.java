package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.INotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
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
    private final CitizenNotificationDispatcher citizenNotificationDispatcher;
    private final FirebasePushClient firebasePushClient;

    @Async
    @Transactional
    public void notifyReportStatusChanged(Report report) {
        citizenNotificationDispatcher.dispatchReportStatusChanged(report);
    }

    @Async
    @Transactional
    public void notifyReportAssigned(Report report, AppUser assignee) {
        Notification notification = Notification.builder()
                .user(assignee)
                .title("Yeni rapor atandı")
                .body(String.format("'%s' başlıklı rapor size atandı.", report.getTitle()))
                .type("REPORT_ASSIGNED")
                .reportId(report.getId())
                .build();

        notificationRepository.save(notification);
        firebasePushClient.send(
                assignee.getFcmToken(),
                notification.getTitle(),
                notification.getBody(),
                Map.of("reportId", report.getId(), "type", "REPORT_ASSIGNED"));
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
}
