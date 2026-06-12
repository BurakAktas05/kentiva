package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.response.report.ReportListResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.geo.DistrictResolutionService;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class ReportSupport {

    private final IReportRepository reportRepository;
    private final IMunicipalityRepository municipalityRepository;
    private final DistrictResolutionService districtResolutionService;
    private final MediaSignedUrlService mediaSignedUrlService;
    private final ReportDuplicateLinkService duplicateLinkService;
    private final QrCodeService qrCodeService;

    public Report findReportOrThrow(String reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Rapor", "id", reportId));
    }

    public Municipality resolveMunicipalityForCoordinates(
            double latitude, double longitude, String targetMunicipalityIdHint) {

        // Kullanici belirli bir belediye sectiyse — koordinatlar belediye sınırları içinde olmalıdır.
        if (targetMunicipalityIdHint != null && !targetMunicipalityIdHint.isBlank()) {
            Municipality target = municipalityRepository.findById(targetMunicipalityIdHint.trim())
                    .orElseThrow(() -> new BusinessException("Secilen belediye bulunamadi.", "MUNICIPALITY_NOT_FOUND"));
            if (!target.isActive() || !target.isOnboarded()) {
                throw new BusinessException("Bu belediye platformda aktif degil.", "MUNICIPALITY_NOT_AVAILABLE");
            }
            boolean inside = municipalityRepository.isWithinBoundaries(target.getId(), latitude, longitude);
            if (!inside) {
                throw new BusinessException(
                        "İhbar konumunuz seçtiğiniz belediyenin sınırları dışındadır.",
                        "LOCATION_OUTSIDE_MUNICIPALITY");
            }
            return target;
        }

        // Belediye secilmemisse koordinatlardan spatial cozumleme yap
        Optional<String> spatialMunicipalityId = districtResolutionService.resolveDistrict(latitude, longitude);
        if (spatialMunicipalityId.isEmpty()) {
            throw new BusinessException(
                    "Konumunuz platformdaki hicbir aktif belediye siniri icinde degil. "
                            + "Lutfen belediyenizi listeden secin.",
                    "LOCATION_OUTSIDE_MUNICIPALITY");
        }

        Municipality target = municipalityRepository.findById(spatialMunicipalityId.get())
                .orElseThrow(() -> new BusinessException("Belediye bulunamadi.", "MUNICIPALITY_NOT_FOUND"));
        if (!target.isActive() || !target.isOnboarded()) {
            throw new BusinessException("Bu konumdaki belediye platformda aktif degil.", "MUNICIPALITY_NOT_AVAILABLE");
        }
        return target;
    }

    public static String municipalityDisplayLabel(Municipality municipality) {
        if (municipality.getDisplayName() != null && !municipality.getDisplayName().isBlank()) {
            return municipality.getDisplayName();
        }
        return municipality.getName();
    }

    public static List<String> distinctIds(List<String> reportIds) {
        Set<String> unique = new LinkedHashSet<>();
        for (String id : reportIds) {
            if (id != null && !id.isBlank()) {
                unique.add(id.trim());
            }
        }
        return List.copyOf(unique);
    }

    public ReportResponse finalizeResponse(Report report, ReportResponse mapped) {
        return finalizeResponse(report, mapped, false);
    }

    public ReportResponse finalizeResponse(Report report, ReportResponse mapped, boolean citizenView) {
        ReportResponse response = withSignedMedia(withDuplicateMeta(mapped, report));
        return citizenView ? sanitizeForCitizen(response) : response;
    }

    private static ReportResponse sanitizeForCitizen(ReportResponse response) {
        return new ReportResponse(
                response.id(),
                response.title(),
                response.description(),
                response.status(),
                response.categoryName(),
                response.reporterFullName(),
                null,
                response.latitude(),
                response.longitude(),
                response.createdAt(),
                response.updatedAt(),
                response.mediaUrls(),
                response.resolvedMediaUrls(),
                response.district(),
                response.aiPriority(),
                response.aiSummary(),
                response.aiSuggestedCategory(),
                response.aiSlaRisk(),
                null,
                response.aiDuplicateHint(),
                response.duplicateGroupId(),
                response.duplicateGroupSize(),
                response.forwardedDepartmentId(),
                response.forwardedDepartmentName(),
                response.forwardedAt(),
                null,
                response.trackingNumber(),
                response.qrCodeBase64());
    }

    public ReportListResponse finalizeListResponse(Report report, ReportListResponse mapped) {
        return withDuplicateMeta(mapped, report);
    }

    /**
     * Batched API: bir sayfa raporun TÜM duplicate group sayılarını TEK SQL ile çözer.
     * Çağıran {@link #finalizeListResponse(Report, ReportListResponse, Map)} ile sayıları enjekte eder.
     */
    public Map<String, Integer> batchDuplicateGroupSizes(List<Report> reports) {
        if (reports == null || reports.isEmpty()) {
            return Collections.emptyMap();
        }
        Set<String> groupIds = new HashSet<>();
        for (Report r : reports) {
            String gid = r.getDuplicateGroupId();
            if (gid != null && !gid.isBlank()) {
                groupIds.add(gid);
            }
        }
        if (groupIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Integer> sizes = new HashMap<>();
        for (Object[] row : reportRepository.countDuplicateGroupsForIds(groupIds)) {
            String gid = (String) row[0];
            int count = ((Number) row[1]).intValue();
            if (count > 1) {
                sizes.put(gid, count);
            }
        }
        return sizes;
    }

    public ReportListResponse finalizeListResponse(
            Report report, ReportListResponse mapped, Map<String, Integer> groupSizeCache) {
        return withDuplicateMeta(mapped, report, groupSizeCache);
    }

    public ReportResponse withSignedMedia(ReportResponse response) {
        if ((response.mediaUrls() == null || response.mediaUrls().isEmpty()) &&
            (response.resolvedMediaUrls() == null || response.resolvedMediaUrls().isEmpty())) {
            return response;
        }
        return new ReportResponse(
                response.id(),
                response.title(),
                response.description(),
                response.status(),
                response.categoryName(),
                response.reporterFullName(),
                response.assigneeFullName(),
                response.latitude(),
                response.longitude(),
                response.createdAt(),
                response.updatedAt(),
                mediaSignedUrlService.signAll(response.mediaUrls()),
                mediaSignedUrlService.signAll(response.resolvedMediaUrls()),
                response.district(),
                response.aiPriority(),
                response.aiSummary(),
                response.aiSuggestedCategory(),
                response.aiSlaRisk(),
                response.aiReplyDraft(),
                response.aiDuplicateHint(),
                response.duplicateGroupId(),
                response.duplicateGroupSize(),
                response.forwardedDepartmentId(),
                response.forwardedDepartmentName(),
                response.forwardedAt(),
                response.forwardedByName(),
                response.trackingNumber(),
                response.qrCodeBase64());
    }

    private ReportResponse withDuplicateMeta(ReportResponse response, Report report) {
        String groupId = report.getDuplicateGroupId();
        Integer size = duplicateGroupSize(groupId);
        return new ReportResponse(
                response.id(),
                response.title(),
                response.description(),
                response.status(),
                response.categoryName(),
                response.reporterFullName(),
                response.assigneeFullName(),
                response.latitude(),
                response.longitude(),
                response.createdAt(),
                response.updatedAt(),
                response.mediaUrls(),
                response.resolvedMediaUrls(),
                response.district(),
                response.aiPriority(),
                response.aiSummary(),
                response.aiSuggestedCategory(),
                response.aiSlaRisk(),
                response.aiReplyDraft(),
                response.aiDuplicateHint(),
                groupId,
                size,
                response.forwardedDepartmentId(),
                response.forwardedDepartmentName(),
                response.forwardedAt(),
                response.forwardedByName(),
                report.getTrackingNumber(),
                qrCodeService.generateQrCodeBase64(report.getTrackingNumber()));
    }

    private ReportListResponse withDuplicateMeta(ReportListResponse response, Report report) {
        return withDuplicateMeta(response, report, null);
    }

    private ReportListResponse withDuplicateMeta(
            ReportListResponse response, Report report, Map<String, Integer> groupSizeCache) {
        String groupId = report.getDuplicateGroupId();
        Integer size;
        if (groupSizeCache != null) {
            size = (groupId == null || groupId.isBlank()) ? null : groupSizeCache.get(groupId);
        } else {
            size = duplicateGroupSize(groupId);
        }
        return new ReportListResponse(
                response.id(),
                response.title(),
                response.status(),
                response.categoryName(),
                response.latitude(),
                response.longitude(),
                response.createdAt(),
                response.district(),
                response.aiPriority(),
                response.aiSlaRisk(),
                groupId,
                size);
    }

    private Integer duplicateGroupSize(String groupId) {
        if (groupId == null || groupId.isBlank()) {
            return null;
        }
        int count = duplicateLinkService.countInGroup(groupId);
        return count > 1 ? count : null;
    }
}
