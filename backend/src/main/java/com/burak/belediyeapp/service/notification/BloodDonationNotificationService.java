package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.BloodSearchAd;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.repository.IBloodSearchAdRepository;
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
public class BloodDonationNotificationService {

    private final IBloodSearchAdRepository bloodSearchAdRepository;
    private final MunicipalityAudienceNotificationSupport audienceSupport;
    private final NotificationBatchPersistenceService notificationBatchPersistenceService;
    private final FirebasePushClient firebasePushClient;

    @Async
    public void broadcast(String bloodAdId) {
        if (bloodAdId == null || bloodAdId.isBlank()) {
            return;
        }

        BloodSearchAd ad = bloodSearchAdRepository.findById(bloodAdId).orElse(null);
        if (ad == null || ad.getUser() == null) {
            return;
        }

        AppUser creator = ad.getUser();
        Municipality municipality = creator.getPreferredMunicipality();
        if (municipality == null) {
            log.info("Kan ilani icin tercih edilen belediye bulunamadi: bloodAdId={}", ad.getId());
            return;
        }

        String title = "Acil Kan Bagisi Cagrisi";
        String body = String.format(
                "%s kan ihtiyaci: %s hastanesinde yatmakta olan %s icin acil kan araniyor.",
                ad.getBloodType(),
                ad.getHospitalName(),
                ad.getPatientName());

        int recipientCount = audienceSupport.forEachRecipientBatch(
                municipality.getId(),
                pref -> pref.isBloodDonationsEnabled(),
                user -> !user.getId().equals(creator.getId()),
                recipients -> {
                    List<Notification> notifications = new ArrayList<>(recipients.size());
                    for (AppUser user : recipients) {
                        notifications.add(Notification.builder()
                                .user(user)
                                .title(title)
                                .body(body)
                                .type("BLOOD_DONATION")
                                .build());
                    }
                    notificationBatchPersistenceService.saveAll(notifications);
                    sendPushes(recipients, title, body, municipality.getId(), ad.getId());
                });

        if (recipientCount > 0) {
            log.info("Kan bagisi bildirimi tamamlandi: bloodAdId={}, recipientCount={}", ad.getId(), recipientCount);
        }
    }

    private void sendPushes(List<AppUser> recipients, String title, String body, String municipalityId, String bloodAdId) {
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
                                "type", "BLOOD_DONATION",
                                "municipalityId", municipalityId,
                                "bloodAdId", bloodAdId
                        )
                );
            } catch (Exception e) {
                log.warn("Blood donation push gonderilemedi: userId={}, err={}", user.getId(), e.getMessage());
            }
        }
    }
}
