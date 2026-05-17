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

import java.util.LinkedHashSet;
import java.util.List;
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

    public Report findReportOrThrow(String reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Rapor", "id", reportId));
    }

    public Municipality resolveMunicipalityForCoordinates(
            double latitude, double longitude, String targetMunicipalityIdHint) {
        Optional<String> spatialMunicipalityId = districtResolutionService.resolveDistrict(latitude, longitude);
        if (spatialMunicipalityId.isEmpty()) {
            throw new BusinessException(
                    "Konumunuz platformdaki hiçbir aktif belediye sınırı içinde değil. "
                            + "Lütfen konumu kontrol edin veya farklı bir noktadan deneyin.",
                    "LOCATION_OUTSIDE_MUNICIPALITY");
        }

        String resolvedId = spatialMunicipalityId.get();
        if (targetMunicipalityIdHint != null && !targetMunicipalityIdHint.isBlank()
                && !resolvedId.equals(targetMunicipalityIdHint.trim())) {
            throw new BusinessException(
                    "Konum, seçtiğiniz belediye sınırlarıyla eşleşmiyor. Konumu yenileyin.",
                    "LOCATION_MUNICIPALITY_MISMATCH");
        }

        Municipality target = municipalityRepository.findById(resolvedId)
                .orElseThrow(() -> new BusinessException("Belediye bulunamadı.", "MUNICIPALITY_NOT_FOUND"));
        if (!target.isActive() || !target.isOnboarded()) {
            throw new BusinessException("Bu konumdaki belediye platformda aktif değil.", "MUNICIPALITY_NOT_AVAILABLE");
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
        return withSignedMedia(withDuplicateMeta(mapped, report));
    }

    public ReportListResponse finalizeListResponse(Report report, ReportListResponse mapped) {
        return withDuplicateMeta(mapped, report);
    }

    public ReportResponse withSignedMedia(ReportResponse response) {
        if (response.mediaUrls() == null || response.mediaUrls().isEmpty()) {
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
                response.district(),
                response.aiPriority(),
                response.aiSummary(),
                response.aiSuggestedCategory(),
                response.aiSlaRisk(),
                response.aiReplyDraft(),
                response.aiDuplicateHint(),
                response.duplicateGroupId(),
                response.duplicateGroupSize());
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
                response.district(),
                response.aiPriority(),
                response.aiSummary(),
                response.aiSuggestedCategory(),
                response.aiSlaRisk(),
                response.aiReplyDraft(),
                response.aiDuplicateHint(),
                groupId,
                size);
    }

    private ReportListResponse withDuplicateMeta(ReportListResponse response, Report report) {
        String groupId = report.getDuplicateGroupId();
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
                groupId,
                duplicateGroupSize(groupId));
    }

    private Integer duplicateGroupSize(String groupId) {
        if (groupId == null || groupId.isBlank()) {
            return null;
        }
        int count = duplicateLinkService.countInGroup(groupId);
        return count > 1 ? count : null;
    }
}
