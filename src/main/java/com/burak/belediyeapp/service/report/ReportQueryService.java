package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.response.report.ReportListResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.dto.response.report.ReportTimelineEntryResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IReportHistoryRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportQueryService {

    private final IReportRepository reportRepository;
    private final IReportHistoryRepository historyRepository;
    private final IReportMapper reportMapper;
    private final ReportSupport reportSupport;
    private final TenantAccessService tenantAccess;

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_CITIZEN')")
    public Page<ReportListResponse> getMyReports(AppUser user, Pageable pageable) {
        return reportRepository.findByReporterId(user.getId(), pageable)
                .map(reportMapper::toListResponse);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public Page<ReportListResponse> getAllReports(AppUser user, Pageable pageable) {
        return tenantAccess.staffMunicipalityScope(user)
                .map(muniId -> reportRepository.findByMunicipalityId(muniId, pageable))
                .orElseGet(() -> reportRepository.findAll(pageable))
                .map(reportMapper::toListResponse);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public Page<ReportListResponse> getReportsByStatus(ReportStatus status, AppUser user, Pageable pageable) {
        return tenantAccess.staffMunicipalityScope(user)
                .map(muniId -> reportRepository.findByMunicipalityIdAndReportStatus(muniId, status, pageable))
                .orElseGet(() -> reportRepository.findByReportStatus(status, pageable))
                .map(reportMapper::toListResponse);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public Page<ReportListResponse> getReportsByDepartment(String departmentId, AppUser user, Pageable pageable) {
        if (tenantAccess.isSuperAdmin(user)) {
            return reportRepository.findByCategoryDepartmentId(departmentId, pageable)
                    .map(reportMapper::toListResponse);
        }
        String muniId = tenantAccess.requireStaffMunicipalityId(user);
        return reportRepository.findByCategoryDepartmentIdAndMunicipalityId(departmentId, muniId, pageable)
                .map(reportMapper::toListResponse);
    }

    @Transactional(readOnly = true)
    public ReportResponse getReportById(String reportId, AppUser currentUser) {
        Report report = reportSupport.findReportOrThrow(reportId);
        tenantAccess.ensureCanViewReport(report, currentUser);
        return reportSupport.withSignedMedia(reportMapper.toResponse(report));
    }

    @Transactional(readOnly = true)
    public List<ReportTimelineEntryResponse> getReportTimeline(String reportId, AppUser currentUser) {
        Report report = reportSupport.findReportOrThrow(reportId);
        tenantAccess.ensureCanViewReport(report, currentUser);
        return historyRepository.findTimelineByReportId(reportId).stream()
                .map(h -> new ReportTimelineEntryResponse(
                        h.getCreatedAt(),
                        h.getOldStatus() != null ? h.getOldStatus().name() : null,
                        h.getNewStatus() != null ? h.getNewStatus().name() : null,
                        h.getChangedBy() != null
                                ? h.getChangedBy().getFirstName() + " " + h.getChangedBy().getLastName()
                                : "Sistem",
                        h.getNote()))
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_FIELD_OFFICER')")
    public Page<ReportListResponse> getMyAssignments(AppUser user, Pageable pageable) {
        String muniId = tenantAccess.requireStaffMunicipalityId(user);
        return reportRepository.findByAssigneeIdAndMunicipalityId(user.getId(), muniId, pageable)
                .map(reportMapper::toListResponse);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public List<ReportListResponse> getNearbyReports(
            double latitude, double longitude, double radiusMeters, AppUser currentUser) {
        List<Report> reports = tenantAccess.staffMunicipalityScope(currentUser)
                .map(muniId -> reportRepository.findNearbyReportsByMunicipality(
                        latitude, longitude, radiusMeters, muniId))
                .orElseGet(() -> reportRepository.findNearbyReports(latitude, longitude, radiusMeters));
        return reports.stream().map(reportMapper::toListResponse).toList();
    }
}
