package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalitySurvey;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.repository.IMunicipalitySurveyRepository;
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
public class SurveyNotificationService {

    private final IMunicipalitySurveyRepository surveyRepository;
    private final MunicipalityAudienceNotificationSupport audienceSupport;
    private final NotificationBatchPersistenceService notificationBatchPersistenceService;
    private final FirebasePushClient firebasePushClient;

    @Async
    public void broadcast(String surveyId) {
        if (surveyId == null || surveyId.isBlank()) {
            return;
        }

        MunicipalitySurvey survey = surveyRepository.findById(surveyId).orElse(null);
        if (survey == null || !survey.isActive() || survey.getMunicipality() == null) {
            return;
        }

        Municipality municipality = survey.getMunicipality();
        String title = "Yeni Belediye Anketi";
        String body = String.format(
                "Fikriniz bizim icin degerli. \"%s\" anketine katilarak +15 itibar puani kazanabilirsiniz.",
                survey.getTitle());

        int recipientCount = audienceSupport.forEachRecipientBatch(
                municipality.getId(),
                pref -> pref.isSurveysEnabled(),
                user -> true,
                recipients -> {
                    List<Notification> notifications = new ArrayList<>(recipients.size());
                    for (AppUser user : recipients) {
                        notifications.add(Notification.builder()
                                .user(user)
                                .title(title)
                                .body(body)
                                .type("SURVEY")
                                .build());
                    }
                    notificationBatchPersistenceService.saveAll(notifications);
                    sendPushes(recipients, title, body, municipality.getId(), survey.getId());
                });

        if (recipientCount > 0) {
            log.info("Anket bildirimi tamamlandi: surveyId={}, recipientCount={}", survey.getId(), recipientCount);
        }
    }

    private void sendPushes(List<AppUser> recipients, String title, String body, String municipalityId, String surveyId) {
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
                                "type", "SURVEY",
                                "municipalityId", municipalityId,
                                "surveyId", surveyId
                        )
                );
            } catch (Exception e) {
                log.warn("Survey push gonderilemedi: userId={}, err={}", user.getId(), e.getMessage());
            }
        }
    }
}
