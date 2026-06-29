package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.LostPetAd;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.repository.ILostPetAdRepository;
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
public class LostPetNotificationService {

    private final ILostPetAdRepository lostPetAdRepository;
    private final MunicipalityAudienceNotificationSupport audienceSupport;
    private final NotificationBatchPersistenceService notificationBatchPersistenceService;
    private final FirebasePushClient firebasePushClient;

    @Async
    public void broadcast(String lostPetAdId) {
        if (lostPetAdId == null || lostPetAdId.isBlank()) {
            return;
        }

        LostPetAd ad = lostPetAdRepository.findById(lostPetAdId).orElse(null);
        if (ad == null || ad.getUser() == null) {
            return;
        }

        AppUser creator = ad.getUser();
        Municipality municipality = creator.getPreferredMunicipality();
        if (municipality == null) {
            log.info("Kayip evcil hayvan ilani icin tercih edilen belediye bulunamadi: lostPetAdId={}", ad.getId());
            return;
        }

        String title = "Kayip Evcil Hayvan Ilani";
        String body = String.format(
                "%s (%s), %s konumunda kaybolmustur. Gorenlerin iletisime gecmesi rica olunur.",
                ad.getPetName(),
                ad.getPetType(),
                ad.getLastSeenDistrict());

        int recipientCount = audienceSupport.forEachRecipientBatch(
                municipality.getId(),
                pref -> pref.isLostPetsEnabled(),
                user -> !user.getId().equals(creator.getId()),
                recipients -> {
                    List<Notification> notifications = new ArrayList<>(recipients.size());
                    for (AppUser user : recipients) {
                        notifications.add(Notification.builder()
                                .user(user)
                                .title(title)
                                .body(body)
                                .type("LOST_PET")
                                .build());
                    }
                    notificationBatchPersistenceService.saveAll(notifications);
                    sendPushes(recipients, title, body, municipality.getId(), ad.getId());
                });

        if (recipientCount > 0) {
            log.info("Kayip evcil hayvan bildirimi tamamlandi: lostPetAdId={}, recipientCount={}", ad.getId(), recipientCount);
        }
    }

    private void sendPushes(List<AppUser> recipients, String title, String body, String municipalityId, String lostPetAdId) {
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
                                "type", "LOST_PET",
                                "municipalityId", municipalityId,
                                "lostPetAdId", lostPetAdId
                        )
                );
            } catch (Exception e) {
                log.warn("Lost pet push gonderilemedi: userId={}, err={}", user.getId(), e.getMessage());
            }
        }
    }
}
