package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.UserNotificationPreference;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IUserNotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Predicate;

@Service
@RequiredArgsConstructor
public class MunicipalityAudienceNotificationSupport {

    private final IAppUserRepository userRepository;
    private final IUserNotificationPreferenceRepository preferenceRepository;

    @Value("${app.notification.broadcast-batch-size:500}")
    private int batchSize;

    public int forEachRecipientBatch(
            String municipalityId,
            Predicate<UserNotificationPreference> preferenceEnabled,
            Predicate<AppUser> additionalFilter,
            Consumer<List<AppUser>> batchConsumer
    ) {
        int pageNumber = 0;
        int totalRecipients = 0;

        while (true) {
            Page<AppUser> page = userRepository.findByPreferredMunicipalityId(
                    municipalityId,
                    PageRequest.of(pageNumber, Math.max(1, batchSize)));
            if (page.isEmpty()) {
                break;
            }

            Map<String, UserNotificationPreference> prefs = loadPreferences(page.getContent());
            List<AppUser> recipients = page.getContent().stream()
                    .filter(additionalFilter)
                    .filter(user -> {
                        UserNotificationPreference pref = prefs.get(user.getId());
                        return pref == null || preferenceEnabled.test(pref);
                    })
                    .toList();

            if (!recipients.isEmpty()) {
                batchConsumer.accept(recipients);
                totalRecipients += recipients.size();
            }

            if (!page.hasNext()) {
                break;
            }
            pageNumber++;
        }

        return totalRecipients;
    }

    private Map<String, UserNotificationPreference> loadPreferences(List<AppUser> users) {
        List<String> userIds = users.stream().map(AppUser::getId).toList();
        Map<String, UserNotificationPreference> prefs = new HashMap<>();
        if (!userIds.isEmpty()) {
            preferenceRepository.findAllByUserIdIn(userIds)
                    .forEach(pref -> prefs.put(pref.getUser().getId(), pref));
        }
        return prefs;
    }
}
