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

/**
 * Uygulama içi bildirim servisi.
 * Rapor durum değişikliği ve atama olaylarında otomatik bildirim üretir.
 * Async çalışır — ana iş akışını yavaşlatmaz.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final INotificationRepository notificationRepository;

    /**
     * Rapor durumu değiştiğinde vatandaşa bildirim gönderir.
     */
    @Async
    @Transactional
    public void notifyReportStatusChanged(Report report) {
        String statusText = switch (report.getReportStatus()) {
            case PROCESSING -> "incelemeye alındı";
            case RESOLVED -> "çözüme kavuşturuldu";
            case REJECTED -> "reddedildi";
            default -> "güncellendi";
        };

        // En son eklenen tarihçe kaydındaki notu alalım (personel notu)
        String note = report.getHistoryList().isEmpty() ? "" : 
                     report.getHistoryList().get(report.getHistoryList().size() - 1).getNote();
        
        String bodyText = String.format("'%s' başlıklı raporunuz %s.", report.getTitle(), statusText);
        if (note != null && !note.isBlank()) {
            bodyText += " Not: " + note;
        }

        Notification notification = Notification.builder()
                .user(report.getReporter())
                .title("Raporunuz " + statusText + "!")
                .body(bodyText)
                .type("REPORT_STATUS_CHANGED")
                .reportId(report.getId())
                .build();

        notificationRepository.save(notification);
        sendPushNotification(report.getReporter(), notification.getTitle(), notification.getBody());
        log.debug("Bildirim gönderildi: Kullanıcı={}, Rapor={}", report.getReporter().getEmail(), report.getId());
    }

    /**
     * Rapor atandığında saha görevlisine bildirim gönderir.
     */
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
        sendPushNotification(assignee, notification.getTitle(), notification.getBody());
    }

    private void sendPushNotification(AppUser user, String title, String body) {
        if (user.getFcmToken() == null || user.getFcmToken().isBlank()) return;

        try {
            com.google.firebase.messaging.Message message = com.google.firebase.messaging.Message.builder()
                    .setToken(user.getFcmToken())
                    .setNotification(com.google.firebase.messaging.Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();
            com.google.firebase.messaging.FirebaseMessaging.getInstance().sendAsync(message);
            log.info("Push bildirimi gönderildi: {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Push bildirimi gönderilemedi (Kullanıcı: {}): {}", user.getEmail(), e.getMessage());
        }
    }

    /**
     * Kullanıcının okunmamış bildirim sayısını döner.
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    /**
     * Kullanıcının bildirimlerini sayfalanmış getirir.
     */
    @Transactional(readOnly = true)
    public Page<Notification> getNotifications(String userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    /**
     * Tüm bildirimleri okundu olarak işaretle.
     */
    @Transactional
    public void markAllAsRead(String userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }
}
