package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.request.report.CreateReportRequest;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IReportHistoryRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportCreationService {

    private final IReportRepository reportRepository;
    private final IReportCategoryRepository categoryRepository;
    private final IReportHistoryRepository historyRepository;
    private final IReportMapper reportMapper;
    private final ReportSupport reportSupport;
    private final TenantAccessService tenantAccess;
    private final MediaSignedUrlService mediaSignedUrlService;
    private final ApplicationEventPublisher eventPublisher;
    private final ReportDuplicateLinkService duplicateLinkService;

    @Transactional
    @PreAuthorize("hasAuthority('ROLE_CITIZEN')")
    @com.burak.belediyeapp.audit.AuditAction(action = "REPORT_CREATE", description = "Yeni bir vatandaş raporu oluşturuldu")
    public ReportResponse createReport(CreateReportRequest request, AppUser reporter) {
        ReportCategory category = categoryRepository.findById(request.categoryId())
                .filter(ReportCategory::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Kategori", "id", request.categoryId()));

        Report report = reportMapper.toEntity(request);
        report.setCategory(category);
        report.setReporter(reporter);

        if (reporter.getMunicipality() != null && !tenantAccess.isCitizenOnly(reporter)) {
            report.setMunicipality(reporter.getMunicipality());
            report.setDistrict(reporter.getMunicipality().getName());
        } else {
            Municipality target = reportSupport.resolveMunicipalityForCoordinates(
                    request.latitude(), request.longitude(), request.targetMunicipalityId());
            tenantAccess.ensureCategoryVisibleToMunicipality(category, target.getId());
            report.setMunicipality(target);
            report.setDistrict(ReportSupport.municipalityDisplayLabel(target));
        }

        Report saved = reportRepository.save(report);

        if (request.mediaUrls() != null && !request.mediaUrls().isEmpty()) {
            List<ReportMedia> mediaList = request.mediaUrls().stream()
                    .map(url -> ReportMedia.builder()
                            .imageUrl(mediaSignedUrlService.persistableStoragePath(url))
                            .report(saved)
                            .build())
                    .toList();
            saved.getMediaList().addAll(mediaList);
            reportRepository.save(saved);
        }

        historyRepository.save(ReportHistory.builder()
                .report(saved)
                .oldStatus(null)
                .newStatus(ReportStatus.PENDING)
                .changedBy(reporter)
                .note("İhbar oluşturuldu · ilçe: " + report.getDistrict())
                .build());

        duplicateLinkService.linkNearbyDuplicates(saved);

        eventPublisher.publishEvent(new ReportCreatedEvent(saved.getId()));

        log.info("Yeni rapor oluşturuldu: {} — {} — ilçe={}", saved.getId(), reporter.getEmail(), report.getDistrict());

        Report refreshed = reportSupport.findReportOrThrow(saved.getId());
        return reportSupport.finalizeResponse(refreshed, reportMapper.toResponse(refreshed));
    }
}
