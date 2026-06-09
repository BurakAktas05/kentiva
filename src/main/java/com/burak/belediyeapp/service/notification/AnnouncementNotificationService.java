package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnnouncementNotificationService {

    private final IAppUserRepository userRepository;
    private final INotificationRepository notificationRepository;
    private final IMunicipalityAnnouncementRepository announcementRepository;
    private final IBusRouteRepository busRouteRepository;
    private final IStarredRouteRepository starredRouteRepository;
    private final IStarredStopRepository starredStopRepository;
    private final IUserNotificationPreferenceRepository preferenceRepository;
    private final FirebasePushClient firebasePushClient;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void broadcast(String announcementId) {
        if (announcementId == null || announcementId.isBlank()) {
            return;
        }

        MunicipalityAnnouncement announcement = announcementRepository.findById(announcementId).orElse(null);
        if (announcement == null || !announcement.isActive() || announcement.getMunicipality() == null) {
            return;
        }

        Municipality m = announcement.getMunicipality();
        String title = announcement.getTitle();
        String content = announcement.getContent();

        // 1. Fetch all users who prefer this municipality
        List<AppUser> allUsers = userRepository.findByPreferredMunicipalityId(m.getId());
        if (allUsers.isEmpty()) {
            log.info("Duyuru yayını için tercih eden vatandaş yok: announcementId={}", announcement.getId());
            return;
        }

        // 2. Scan text for transit route and stop mentions
        String combinedText = (title + " " + content).toLowerCase(Locale.forLanguageTag("tr-TR"));

        // Find mentioned bus routes
        List<BusRoute> routes = busRouteRepository.findAllByMunicipalityIdAndActiveTrue(m.getId());
        Set<String> matchedRouteIds = new HashSet<>();
        for (BusRoute route : routes) {
            if (mentionsToken(combinedText, route.getCode()) || mentionsToken(combinedText, route.getName())) {
                matchedRouteIds.add(route.getId());
            }
        }

        // Find mentioned starred stops from the route stops
        Set<String> matchedStopNames = new HashSet<>();
        Set<String> allStopNames = new HashSet<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        for (BusRoute route : routes) {
            try {
                List<String> stops = mapper.readValue(route.getStopsJson(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                if (stops != null) {
                    allStopNames.addAll(stops);
                }
            } catch (Exception e) {
                log.error("Failed to parse stops JSON for route: " + route.getId(), e);
            }
        }

        for (String stopName : allStopNames) {
            if (mentionsToken(combinedText, stopName)) {
                matchedStopNames.add(stopName);
            }
        }

        // 3. Find users who starred matched routes or stops -> priority users
        Set<String> priorityUserIds = new HashSet<>();
        for (String routeId : matchedRouteIds) {
            List<StarredRoute> starred = starredRouteRepository.findAllByRouteId(routeId);
            for (StarredRoute sr : starred) {
                priorityUserIds.add(sr.getUser().getId());
            }
        }
        for (String stopName : matchedStopNames) {
            List<StarredStop> starred = starredStopRepository.findAllByStopNameAndMunicipalityId(stopName, m.getId());
            for (StarredStop ss : starred) {
                priorityUserIds.add(ss.getUser().getId());
            }
        }

        // 4. Divide allUsers into priorityUsers and regularUsers
        List<AppUser> priorityRecipients = new ArrayList<>();
        List<AppUser> regularRecipients = new ArrayList<>();

        for (AppUser user : allUsers) {
            if (priorityUserIds.contains(user.getId())) {
                priorityRecipients.add(user);
            } else {
                boolean announcementsEnabled = preferenceRepository.findByUserId(user.getId())
                        .map(UserNotificationPreference::isAnnouncementsEnabled)
                        .orElse(true);
                if (announcementsEnabled) {
                    regularRecipients.add(user);
                }
            }
        }

        // 5. Build and save notifications
        List<Notification> notificationsToSave = new ArrayList<>();
        String priorityTitle = "🌟 [Ulaşım Duyurusu] " + title;
        String truncatedContent = truncate(content, 200);

        for (AppUser user : priorityRecipients) {
            notificationsToSave.add(Notification.builder()
                    .user(user)
                    .title(priorityTitle)
                    .body(truncatedContent)
                    .type("TRANSIT_ANNOUNCEMENT")
                    .reportId(null)
                    .build());
        }

        for (AppUser user : regularRecipients) {
            notificationsToSave.add(Notification.builder()
                    .user(user)
                    .title(title)
                    .body(truncatedContent)
                    .type("ANNOUNCEMENT")
                    .reportId(null)
                    .build());
        }

        if (!notificationsToSave.isEmpty()) {
            notificationRepository.saveAll(notificationsToSave);
        }

        // 6. Dispatch FCM Push Notifications
        for (AppUser user : priorityRecipients) {
            if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                firebasePushClient.send(
                        user.getFcmToken(),
                        priorityTitle,
                        truncatedContent,
                        Map.of(
                                "type", "TRANSIT_ANNOUNCEMENT",
                                "municipalityId", m.getId(),
                                "announcementId", announcement.getId(),
                                "priority", "high"
                        )
                );
            }
        }

        for (AppUser user : regularRecipients) {
            if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                firebasePushClient.send(
                        user.getFcmToken(),
                        title,
                        truncatedContent,
                        Map.of(
                                "type", "ANNOUNCEMENT",
                                "municipalityId", m.getId(),
                                "announcementId", announcement.getId()
                        )
                );
            }
        }

        log.info("Duyuru yayını tamamlandı. announcementId={}, priorityCount={}, regularCount={}",
                announcement.getId(), priorityRecipients.size(), regularRecipients.size());
    }

    private boolean mentionsToken(String text, String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        String cleanToken = token.toLowerCase(Locale.forLanguageTag("tr-TR")).trim();
        String escapedToken = Pattern.quote(cleanToken);
        String regex = "(?i)(^|[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ])" + escapedToken + "([^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]|$)";
        return Pattern.compile(regex).matcher(text).find();
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }
}
