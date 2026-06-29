package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityOutage;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.repository.IMunicipalityOutageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutageNotificationService {

    private static final DateTimeFormatter TR_DATETIME = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final IMunicipalityOutageRepository outageRepository;
    private final MunicipalityAudienceNotificationSupport audienceSupport;
    private final NotificationBatchPersistenceService notificationBatchPersistenceService;
    private final FirebasePushClient firebasePushClient;

    @Async
    public void broadcast(String outageId) {
        if (outageId == null || outageId.isBlank()) {
            return;
        }
        MunicipalityOutage outage = outageRepository.findById(outageId).orElse(null);
        if (outage == null || !outage.isActive() || outage.getMunicipality() == null) {
            return;
        }

        Municipality municipality = outage.getMunicipality();
        String title = buildTitle(outage, municipality);
        String body = buildBody(outage);
        String typeCode = isWater(outage.getOutageType()) ? "OUTAGE_WATER" : "OUTAGE_ELECTRIC";

        int recipientCount = audienceSupport.forEachRecipientBatch(
                municipality.getId(),
                pref -> pref.isOutagesEnabled(),
                user -> true,
                recipients -> {
                    List<Notification> notifications = new ArrayList<>(recipients.size());
                    for (AppUser user : recipients) {
                        notifications.add(Notification.builder()
                                .user(user)
                                .title(title)
                                .body(body)
                                .type(typeCode)
                                .reportId(null)
                                .build());
                    }
                    notificationBatchPersistenceService.saveAll(notifications);
                    sendPushes(recipients, title, body, municipality.getId(), outage.getId(), typeCode);
                });

        if (recipientCount > 0) {
            log.info("Kesinti bildirimi tamamlandi: outageId={}, recipientCount={}", outage.getId(), recipientCount);
        }
    }

    private void sendPushes(List<AppUser> recipients, String title, String body, String municipalityId, String outageId, String typeCode) {
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
                                "type", typeCode,
                                "municipalityId", municipalityId,
                                "outageId", outageId != null ? outageId : ""
                        )
                );
            } catch (Exception e) {
                log.warn("Outage push gonderilemedi: userId={}, err={}", user.getId(), e.getMessage());
            }
        }
    }

    private static boolean isWater(String type) {
        return "WATER".equalsIgnoreCase(type);
    }

    private static String buildTitle(MunicipalityOutage outage, Municipality municipality) {
        String prefix = (municipality.getDisplayName() != null && !municipality.getDisplayName().isBlank())
                ? municipality.getDisplayName().trim()
                : (municipality.getName() != null ? municipality.getName() : "Belediyeniz");
        String kind = isWater(outage.getOutageType()) ? "Su kesintisi" : "Elektrik kesintisi";
        return prefix + " - " + kind;
    }

    private static String buildBody(MunicipalityOutage outage) {
        StringBuilder builder = new StringBuilder();
        if (outage.getTitle() != null && !outage.getTitle().isBlank()) {
            builder.append(outage.getTitle().trim());
        }
        if (outage.getDistrict() != null && !outage.getDistrict().isBlank()) {
            if (builder.length() > 0) {
                builder.append(" · ");
            }
            builder.append(outage.getDistrict().trim());
        }
        String window = formatWindow(outage.getStartsAt(), outage.getEndsAt());
        if (!window.isEmpty()) {
            if (builder.length() > 0) {
                builder.append(" - ");
            }
            builder.append(window);
        }
        if (outage.getMessage() != null && !outage.getMessage().isBlank()) {
            if (builder.length() > 0) {
                builder.append(" - ");
            }
            builder.append(truncate(outage.getMessage().trim(), 200));
        }
        if (builder.length() == 0) {
            builder.append("Bolgenizde planli bir kesinti duyuruldu.");
        }
        return builder.toString();
    }

    private static String formatWindow(LocalDateTime start, LocalDateTime end) {
        if (start == null && end == null) {
            return "";
        }
        if (start != null && end != null) {
            return TR_DATETIME.format(start) + " -> " + TR_DATETIME.format(end);
        }
        return TR_DATETIME.format(start != null ? start : end);
    }

    private static String truncate(String text, int max) {
        if (text == null) {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }
}
