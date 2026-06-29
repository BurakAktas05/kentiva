package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityAnnouncement;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.repository.IMunicipalityAnnouncementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnnouncementNotificationService {

    private final IMunicipalityAnnouncementRepository announcementRepository;
    private final MunicipalityAudienceNotificationSupport audienceSupport;
    private final NotificationBatchPersistenceService notificationBatchPersistenceService;
    private final FirebasePushClient firebasePushClient;

    @Async
    public void broadcast(String announcementId) {
        if (announcementId == null || announcementId.isBlank()) {
            return;
        }

        MunicipalityAnnouncement announcement = announcementRepository.findById(announcementId).orElse(null);
        if (announcement == null || !announcement.isActive() || announcement.getMunicipality() == null) {
            return;
        }

        Municipality municipality = announcement.getMunicipality();
        String title = announcement.getTitle();
        String body = truncate(announcement.getContent(), 200);

        int recipientCount = audienceSupport.forEachRecipientBatch(
                municipality.getId(),
                pref -> pref.isAnnouncementsEnabled(),
                user -> true,
                recipients -> {
                    List<Notification> notifications = new ArrayList<>(recipients.size());
                    for (AppUser user : recipients) {
                        notifications.add(Notification.builder()
                                .user(user)
                                .title(title)
                                .body(body)
                                .type("ANNOUNCEMENT")
                                .reportId(null)
                                .build());
                    }
                    notificationBatchPersistenceService.saveAll(notifications);
                    sendPushes(recipients, title, body, municipality.getId(), announcement.getId());
                });

        if (recipientCount == 0) {
            log.info("Duyuru yayini icin aktif alici bulunamadi: announcementId={}", announcement.getId());
            return;
        }

        log.info("Duyuru yayini tamamlandi. announcementId={}, recipientCount={}",
                announcement.getId(), recipientCount);
    }

    private void sendPushes(List<AppUser> recipients, String title, String body, String municipalityId, String announcementId) {
        for (AppUser user : recipients) {
            if (user.getFcmToken() == null || user.getFcmToken().isBlank()) {
                continue;
            }
            try {
                firebasePushClient.send(
                        user.getFcmToken(),
                        title,
                        body,
                        Map.of(
                                "type", "ANNOUNCEMENT",
                                "municipalityId", municipalityId,
                                "announcementId", announcementId
                        )
                );
            } catch (Exception e) {
                log.warn("Announcement push gonderilemedi: userId={}, err={}", user.getId(), e.getMessage());
            }
        }
    }

    private String truncate(String text, int max) {
        if (text == null) {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }
}
