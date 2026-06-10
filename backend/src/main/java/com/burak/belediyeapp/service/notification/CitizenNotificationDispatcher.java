package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IReportHistoryRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.notification.channel.ReportStatusNotificationHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Vatandaş bildirim kanallarını duruma göre yönlendirir (Open/Closed — yeni kanal = yeni handler).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CitizenNotificationDispatcher {

    private final IReportRepository reportRepository;
    private final IAppUserRepository appUserRepository;
    private final IReportHistoryRepository reportHistoryRepository;
    private final List<ReportStatusNotificationHandler> statusHandlers;

    public void dispatchReportStatusChanged(Report report) {
        Report loaded = reportRepository.findByIdWithMunicipality(report.getId()).orElse(null);
        if (loaded == null || loaded.getReporter() == null) {
            return;
        }
        AppUser reporter = appUserRepository.findById(loaded.getReporter().getId()).orElse(null);
        if (reporter == null) {
            return;
        }

        ReportStatus status = loaded.getReportStatus();
        if (status == ReportStatus.PENDING) {
            log.debug("PENDING için vatandaş bildirimi atlandı: {}", loaded.getId());
            return;
        }

        String note = reportHistoryRepository.findFirstByReport_IdOrderByCreatedAtDesc(loaded.getId())
                .map(h -> h.getNote())
                .orElse("");

        List<ReportStatusNotificationHandler> matched = statusHandlers.stream()
                .filter(h -> h.supports(status))
                .toList();

        if (matched.isEmpty()) {
            log.warn("Durum için handler yok: {}", status);
        } else {
            matched.forEach(h -> h.deliver(reporter, loaded, note));
        }
    }
}
