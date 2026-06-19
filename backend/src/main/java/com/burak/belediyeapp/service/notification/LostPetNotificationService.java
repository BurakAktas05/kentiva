package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class LostPetNotificationService {

    private final IAppUserRepository userRepository;
    private final INotificationRepository notificationRepository;
    private final ILostPetAdRepository lostPetAdRepository;
    private final IUserNotificationPreferenceRepository preferenceRepository;
    private final FirebasePushClient firebasePushClient;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void broadcast(String lostPetAdId) {
        if (lostPetAdId == null || lostPetAdId.isBlank()) {
            return;
        }

        LostPetAd ad = lostPetAdRepository.findById(lostPetAdId).orElse(null);
        if (ad == null || ad.getUser() == null) {
            return;
        }

        AppUser creator = ad.getUser();
        Municipality m = creator.getPreferredMunicipality();
        if (m == null) {
            log.info("Kayıp evcil hayvan ilanı yayını için ilan sahibinin tercih ettiği belediye bulunamadı. lostPetAdId={}", ad.getId());
            return;
        }

        List<AppUser> allUsers = userRepository.findByPreferredMunicipalityId(m.getId());
        if (allUsers.isEmpty()) {
            log.info("Kayıp evcil hayvan ilanı yayını için tercih eden vatandaş yok: lostPetAdId={}", ad.getId());
            return;
        }

        List<String> userIds = allUsers.stream().map(AppUser::getId).toList();
        Map<String, UserNotificationPreference> prefsMap = new java.util.HashMap<>();
        if (!userIds.isEmpty()) {
            preferenceRepository.findAllByUserIdIn(userIds)
                    .forEach(p -> prefsMap.put(p.getUser().getId(), p));
        }

        List<AppUser> recipients = allUsers.stream()
                .filter(user -> {
                    // İlanı oluşturan kişiye bildirim gönderme
                    if (user.getId().equals(creator.getId())) {
                        return false;
                    }
                    UserNotificationPreference pref = prefsMap.get(user.getId());
                    return pref == null || pref.isLostPetsEnabled();
                })
                .toList();

        if (recipients.isEmpty()) {
            return;
        }

        String title = "🐾 Kayıp Evcil Hayvan İlanı";
        String body = String.format("%s (%s), %s konumunda kaybolmuştur. Görenlerin iletişime geçmesi rica olunur.",
                ad.getPetName(), ad.getPetType(), ad.getLastSeenDistrict());

        List<Notification> notificationsToSave = new ArrayList<>(recipients.size());
        for (AppUser user : recipients) {
            notificationsToSave.add(Notification.builder()
                    .user(user)
                    .title(title)
                    .body(body)
                    .type("LOST_PET")
                    .build());
        }

        notificationRepository.saveAll(notificationsToSave);
        log.info("Kayıp evcil hayvan bildirimi {} vatandaşa kaydedildi (lostPetAdId={})", notificationsToSave.size(), ad.getId());

        for (AppUser user : recipients) {
            if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                try {
                    firebasePushClient.send(
                            user.getFcmToken(),
                            title,
                            body,
                            Map.of(
                                    "type", "LOST_PET",
                                    "municipalityId", m.getId(),
                                    "lostPetAdId", ad.getId()
                            )
                    );
                } catch (Exception e) {
                    log.warn("FCM push notification could not be sent to user: {}", user.getId(), e);
                }
            }
        }
    }
}
