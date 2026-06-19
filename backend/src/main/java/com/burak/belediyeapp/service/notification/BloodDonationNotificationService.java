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
public class BloodDonationNotificationService {

    private final IAppUserRepository userRepository;
    private final INotificationRepository notificationRepository;
    private final IBloodSearchAdRepository bloodSearchAdRepository;
    private final IUserNotificationPreferenceRepository preferenceRepository;
    private final FirebasePushClient firebasePushClient;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void broadcast(String bloodAdId) {
        if (bloodAdId == null || bloodAdId.isBlank()) {
            return;
        }

        BloodSearchAd ad = bloodSearchAdRepository.findById(bloodAdId).orElse(null);
        if (ad == null || ad.getUser() == null) {
            return;
        }

        AppUser creator = ad.getUser();
        Municipality m = creator.getPreferredMunicipality();
        if (m == null) {
            log.info("Kan ilanı yayını için ilan sahibinin tercih ettiği belediye bulunamadı. bloodAdId={}", ad.getId());
            return;
        }

        List<AppUser> allUsers = userRepository.findByPreferredMunicipalityId(m.getId());
        if (allUsers.isEmpty()) {
            log.info("Kan ilanı yayını için tercih eden vatandaş yok: bloodAdId={}", ad.getId());
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
                    return pref == null || pref.isBloodDonationsEnabled();
                })
                .toList();

        if (recipients.isEmpty()) {
            return;
        }

        String title = "🚨 Acil Kan Bağışı Çağrısı";
        String body = String.format("%s Kan İhtiyacı: %s hastanesinde yatmakta olan %s için acil kan aranıyor.",
                ad.getBloodType(), ad.getHospitalName(), ad.getPatientName());

        List<Notification> notificationsToSave = new ArrayList<>(recipients.size());
        for (AppUser user : recipients) {
            notificationsToSave.add(Notification.builder()
                    .user(user)
                    .title(title)
                    .body(body)
                    .type("BLOOD_DONATION")
                    .build());
        }

        notificationRepository.saveAll(notificationsToSave);
        log.info("Kan bağışı bildirimi {} vatandaşa kaydedildi (bloodAdId={})", notificationsToSave.size(), ad.getId());

        for (AppUser user : recipients) {
            if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                try {
                    firebasePushClient.send(
                            user.getFcmToken(),
                            title,
                            body,
                            Map.of(
                                    "type", "BLOOD_DONATION",
                                    "municipalityId", m.getId(),
                                    "bloodAdId", ad.getId()
                            )
                    );
                } catch (Exception e) {
                    log.warn("FCM push notification could not be sent to user: {}", user.getId(), e);
                }
            }
        }
    }
}
