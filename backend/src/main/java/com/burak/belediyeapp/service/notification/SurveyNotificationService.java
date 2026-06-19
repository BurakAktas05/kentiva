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
public class SurveyNotificationService {

    private final IAppUserRepository userRepository;
    private final INotificationRepository notificationRepository;
    private final IMunicipalitySurveyRepository surveyRepository;
    private final IUserNotificationPreferenceRepository preferenceRepository;
    private final FirebasePushClient firebasePushClient;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void broadcast(String surveyId) {
        if (surveyId == null || surveyId.isBlank()) {
            return;
        }

        MunicipalitySurvey survey = surveyRepository.findById(surveyId).orElse(null);
        if (survey == null || !survey.isActive() || survey.getMunicipality() == null) {
            return;
        }

        Municipality m = survey.getMunicipality();
        List<AppUser> allUsers = userRepository.findByPreferredMunicipalityId(m.getId());
        if (allUsers.isEmpty()) {
            log.info("Anket yayını için tercih eden vatandaş yok: surveyId={}", survey.getId());
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
                    UserNotificationPreference pref = prefsMap.get(user.getId());
                    return pref == null || pref.isSurveysEnabled();
                })
                .toList();

        if (recipients.isEmpty()) {
            return;
        }

        String title = "🗳️ Yeni Belediye Anketi";
        String body = String.format("Fikriniz bizim için değerli! \"%s\" anketine katılarak +15 itibar puanı kazanabilirsiniz.",
                survey.getTitle());

        List<Notification> notificationsToSave = new ArrayList<>(recipients.size());
        for (AppUser user : recipients) {
            notificationsToSave.add(Notification.builder()
                    .user(user)
                    .title(title)
                    .body(body)
                    .type("SURVEY")
                    .build());
        }

        notificationRepository.saveAll(notificationsToSave);
        log.info("Anket bildirimi {} vatandaşa kaydedildi (surveyId={})", notificationsToSave.size(), survey.getId());

        for (AppUser user : recipients) {
            if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                try {
                    firebasePushClient.send(
                            user.getFcmToken(),
                            title,
                            body,
                            Map.of(
                                    "type", "SURVEY",
                                    "municipalityId", m.getId(),
                                    "surveyId", survey.getId()
                            )
                    );
                } catch (Exception e) {
                    log.warn("FCM push notification could not be sent to user: {}", user.getId(), e);
                }
            }
        }
    }
}
