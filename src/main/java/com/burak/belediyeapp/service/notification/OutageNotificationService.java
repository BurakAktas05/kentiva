package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityOutage;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalityOutageRepository;
import com.burak.belediyeapp.repository.INotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Planlı kesinti vatandaş bildirimi.
 *
 * Belediyenin "tercih edilen belediye" olarak seçildiği vatandaşlara
 * — in-app bildirim (zil ikonu) + (varsa) Firebase push gönderir.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OutageNotificationService {

    private static final DateTimeFormatter TR_DATETIME =
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final IAppUserRepository userRepository;
    private final INotificationRepository notificationRepository;
    private final IMunicipalityOutageRepository outageRepository;
    private final FirebasePushClient firebasePushClient;

    /**
     * Asenkron yayın — admin kesintiyi kaydederken yanıt bekleterek bloklamaz.
     * Yeni bir transaction açar ve entity'yi taze çeker (LAZY proxy sorunu olmasın diye).
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void broadcast(String outageId) {
        if (outageId == null || outageId.isBlank()) {
            return;
        }
        MunicipalityOutage outage = outageRepository.findById(outageId).orElse(null);
        if (outage == null || !outage.isActive() || outage.getMunicipality() == null) {
            return;
        }
        Municipality m = outage.getMunicipality();
        List<AppUser> recipients = userRepository.findByPreferredMunicipalityId(m.getId());
        if (recipients.isEmpty()) {
            log.info("Kesinti yayını için tercih eden vatandaş yok: outageId={}", outage.getId());
            return;
        }

        String title = buildTitle(outage, m);
        String body = buildBody(outage);
        String typeCode = isWater(outage.getOutageType()) ? "OUTAGE_WATER" : "OUTAGE_ELECTRIC";

        List<Notification> rows = new ArrayList<>(recipients.size());
        for (AppUser user : recipients) {
            rows.add(Notification.builder()
                    .user(user)
                    .title(title)
                    .body(body)
                    .type(typeCode)
                    .reportId(null)
                    .build());
        }
        notificationRepository.saveAll(rows);
        log.info("Kesinti bildirimi {} vatandaşa kaydedildi (outageId={})", rows.size(), outage.getId());

        for (AppUser user : recipients) {
            if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                firebasePushClient.send(
                        user.getFcmToken(),
                        title,
                        body,
                        Map.of(
                                "type", typeCode,
                                "municipalityId", m.getId(),
                                "outageId", outage.getId() != null ? outage.getId() : ""));
            }
        }
    }

    private static boolean isWater(String type) {
        return "WATER".equalsIgnoreCase(type);
    }

    private static String buildTitle(MunicipalityOutage o, Municipality m) {
        String prefix = (m.getDisplayName() != null && !m.getDisplayName().isBlank())
                ? m.getDisplayName().trim()
                : (m.getName() != null ? m.getName() : "Belediyeniz");
        String kind = isWater(o.getOutageType()) ? "Su kesintisi" : "Elektrik kesintisi";
        return prefix + " — " + kind;
    }

    private static String buildBody(MunicipalityOutage o) {
        StringBuilder sb = new StringBuilder();
        if (o.getTitle() != null && !o.getTitle().isBlank()) {
            sb.append(o.getTitle().trim());
        }
        if (o.getDistrict() != null && !o.getDistrict().isBlank()) {
            if (sb.length() > 0) sb.append(" · ");
            sb.append(o.getDistrict().trim());
        }
        String window = formatWindow(o.getStartsAt(), o.getEndsAt());
        if (!window.isEmpty()) {
            if (sb.length() > 0) sb.append(" — ");
            sb.append(window);
        }
        if (o.getMessage() != null && !o.getMessage().isBlank()) {
            if (sb.length() > 0) sb.append(" — ");
            sb.append(truncate(o.getMessage().trim(), 200));
        }
        if (sb.length() == 0) {
            sb.append("Bölgenizde planlı bir kesinti duyuruldu.");
        }
        return sb.toString();
    }

    private static String formatWindow(LocalDateTime start, LocalDateTime end) {
        if (start == null && end == null) return "";
        if (start != null && end != null) {
            return TR_DATETIME.format(start) + " → " + TR_DATETIME.format(end);
        }
        return TR_DATETIME.format(start != null ? start : end);
    }

    private static String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }
}
