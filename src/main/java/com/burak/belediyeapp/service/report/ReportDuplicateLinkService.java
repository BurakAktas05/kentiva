package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Yakın konumdaki aktif ihbarları aynı {@code duplicate_group_id} altında birleştirir.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportDuplicateLinkService {

    private final IReportRepository reportRepository;

    @Value("${app.report.duplicate-radius-meters:75}")
    private double radiusMeters;

    @Transactional
    public void linkNearbyDuplicates(Report report) {
        if (report.getLocation() == null || report.getMunicipality() == null) {
            return;
        }
        double lat = report.getLocation().getY();
        double lng = report.getLocation().getX();
        String municipalityId = report.getMunicipality().getId();

        // Duplicate kümeleme için bir aşamada en fazla 50 yakın aktif kayıt yeterli;
        // sayfa boyutu büyütülmek istenirse property ile değiştirilebilir.
        List<Report> nearby = reportRepository.findActiveNearbyInMunicipality(
                lat, lng, radiusMeters, municipalityId, report.getId(), 50);
        if (nearby.isEmpty()) {
            return;
        }

        String groupId = resolveGroupId(nearby, report.getDuplicateGroupId());
        Set<Report> toUpdate = new LinkedHashSet<>(nearby);
        toUpdate.add(report);

        // Save-in-loop yerine tek saveAll: flush sayısını azaltır, JDBC batch çalışır.
        java.util.List<Report> dirty = new java.util.ArrayList<>();
        for (Report r : toUpdate) {
            if (!groupId.equals(r.getDuplicateGroupId())) {
                r.setDuplicateGroupId(groupId);
                dirty.add(r);
            }
        }
        if (!dirty.isEmpty()) {
            reportRepository.saveAll(dirty);
        }

        int size = reportRepository.countByDuplicateGroupId(groupId);
        if (size > 1) {
            log.info("Duplicate group {} now has {} reports (triggered by {})", groupId, size, report.getId());
        }
    }

    private static String resolveGroupId(List<Report> nearby, String currentGroupId) {
        if (currentGroupId != null && !currentGroupId.isBlank()) {
            return currentGroupId;
        }
        for (Report r : nearby) {
            if (r.getDuplicateGroupId() != null && !r.getDuplicateGroupId().isBlank()) {
                return r.getDuplicateGroupId();
            }
        }
        return UUID.randomUUID().toString();
    }

    @Transactional(readOnly = true)
    public int countInGroup(String duplicateGroupId) {
        if (duplicateGroupId == null || duplicateGroupId.isBlank()) {
            return 1;
        }
        return reportRepository.countByDuplicateGroupId(duplicateGroupId);
    }

    @Transactional(readOnly = true)
    public List<Report> membersOfGroup(String duplicateGroupId, String excludeReportId) {
        if (duplicateGroupId == null || duplicateGroupId.isBlank()) {
            return List.of();
        }
        return reportRepository.findByDuplicateGroupIdAndIdNot(duplicateGroupId, excludeReportId);
    }
}
