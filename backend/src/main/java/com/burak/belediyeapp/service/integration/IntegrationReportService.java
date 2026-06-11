package com.burak.belediyeapp.service.integration;

import com.burak.belediyeapp.dto.response.report.ReportListResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.integration.ApiKeyScope;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.security.ApiKeyPrincipal;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import com.burak.belediyeapp.service.report.ReportSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IntegrationReportService {

    private final IReportRepository reportRepository;
    private final IReportMapper reportMapper;
    private final MediaSignedUrlService mediaSignedUrlService;
    private final ReportSupport reportSupport;

    @Transactional(readOnly = true)
    public Page<ReportListResponse> listReports(ApiKeyPrincipal principal, ReportStatus status, Pageable pageable) {
        requireScope(principal, ApiKeyScope.REPORTS_READ.code());
        String municipalityId = principal.getMunicipalityId();
        if (status != null) {
            return reportRepository.findByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(municipalityId, status, pageable)
                    .map(reportMapper::toListResponse);
        }
        return reportRepository.findByMunicipalityIdAndHiddenFromMunicipalityFalse(municipalityId, pageable)
                .map(reportMapper::toListResponse);
    }

    @Transactional(readOnly = true)
    public ReportResponse getReport(ApiKeyPrincipal principal, String reportId) {
        requireScope(principal, ApiKeyScope.REPORTS_READ.code());
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Rapor", "id", reportId));
        if (report.getMunicipality() == null
                || !report.getMunicipality().getId().equals(principal.getMunicipalityId())) {
            throw new BusinessException("Bu rapora erişim yetkiniz yok", "CROSS_MUNICIPALITY_ACCESS");
        }
        return reportSupport.finalizeResponse(report, reportMapper.toResponse(report));
    }

    private static void requireScope(ApiKeyPrincipal principal, String scope) {
        if (!principal.hasScope(scope)) {
            throw new BusinessException("API anahtarı bu işlem için yetkili değil", "API_KEY_SCOPE_DENIED");
        }
    }

    private ReportResponse withSignedMedia(ReportResponse response) {
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
                response.duplicateGroupSize(),
                response.forwardedDepartmentId(),
                response.forwardedDepartmentName(),
                response.forwardedAt(),
                response.forwardedByName()
        );
    }
}
