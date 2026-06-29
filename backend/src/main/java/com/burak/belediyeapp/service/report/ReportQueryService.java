package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.response.report.NearbyReportHintResponse;
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
import com.burak.belediyeapp.service.notification.ReportLanguageMessages;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReportQueryService {

    private final IReportRepository reportRepository;
    private final IReportHistoryRepository historyRepository;
    private final IReportMapper reportMapper;
    private final ReportSupport reportSupport;
    private final TenantAccessService tenantAccess;
    private final ReportDuplicateLinkService duplicateLinkService;

    private ReportListResponse toListDto(Report report) {
        return reportSupport.finalizeListResponse(report, reportMapper.toListResponse(report));
    }

    /** Sayfa boyunca duplicate group sayılarını TEK SQL ile çözer (N+1 önleme). */
    private Page<ReportListResponse> mapPage(Page<Report> page) {
        Map<String, Integer> sizes = reportSupport.batchDuplicateGroupSizes(page.getContent());
        return page.map(r -> reportSupport.finalizeListResponse(r, reportMapper.toListResponse(r), sizes));
    }

    private List<ReportListResponse> mapList(List<Report> reports) {
        Map<String, Integer> sizes = reportSupport.batchDuplicateGroupSizes(reports);
        return reports.stream()
                .map(r -> reportSupport.finalizeListResponse(r, reportMapper.toListResponse(r), sizes))
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_CITIZEN')")
    public Page<ReportListResponse> getMyReports(AppUser user, Pageable pageable) {
        return mapPage(reportRepository.findByReporterId(user.getId(), pageable));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_WHITE_DESK')")
    public Page<ReportListResponse> getAllReports(AppUser user, Pageable pageable) {
        Page<Report> page;
        if (user.getDepartment() != null) {
            String deptId = user.getDepartment().getId();
            if (user.getMunicipality() != null && user.getMunicipality().getWorkflowMode() == com.burak.belediyeapp.entity.WorkflowMode.DEPARTMENTAL) {
                page = tenantAccess.staffMunicipalityScope(user)
                        .map(muniId -> reportRepository.findByForwardedDepartmentIdAndMunicipalityIdAndHiddenFromMunicipalityFalse(deptId, muniId, pageable))
                        .orElseGet(() -> reportRepository.findByForwardedDepartmentIdAndHiddenFromMunicipalityFalse(deptId, pageable));
            } else {
                page = tenantAccess.staffMunicipalityScope(user)
                        .map(muniId -> reportRepository.findByCategoryDepartmentIdAndMunicipalityIdAndHiddenFromMunicipalityFalse(deptId, muniId, pageable))
                        .orElseGet(() -> reportRepository.findByCategoryDepartmentIdAndHiddenFromMunicipalityFalse(deptId, pageable));
            }
        } else {
            page = tenantAccess.staffMunicipalityScope(user)
                    .map(muniId -> reportRepository.findByMunicipalityIdAndHiddenFromMunicipalityFalse(muniId, pageable))
                    .orElseGet(() -> reportRepository.findAll(pageable));
        }
        return mapPage(page);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_WHITE_DESK')")
    public Page<ReportListResponse> getReportsByStatus(ReportStatus status, AppUser user, Pageable pageable) {
        Page<Report> page;
        if (user.getDepartment() != null) {
            String deptId = user.getDepartment().getId();
            if (user.getMunicipality() != null && user.getMunicipality().getWorkflowMode() == com.burak.belediyeapp.entity.WorkflowMode.DEPARTMENTAL) {
                page = tenantAccess.staffMunicipalityScope(user)
                        .map(muniId -> reportRepository.findByForwardedDepartmentIdAndMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(deptId, muniId, status, pageable))
                        .orElseGet(() -> reportRepository.findByForwardedDepartmentIdAndReportStatusAndHiddenFromMunicipalityFalse(deptId, status, pageable));
            } else {
                page = tenantAccess.staffMunicipalityScope(user)
                        .map(muniId -> reportRepository.findByCategoryDepartmentIdAndMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(deptId, muniId, status, pageable))
                        .orElseGet(() -> reportRepository.findByCategoryDepartmentIdAndReportStatusAndHiddenFromMunicipalityFalse(deptId, status, pageable));
            }
        } else {
            page = tenantAccess.staffMunicipalityScope(user)
                    .map(muniId -> reportRepository.findByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(muniId, status, pageable))
                    .orElseGet(() -> reportRepository.findByReportStatusAndHiddenFromMunicipalityFalse(status, pageable));
        }
        return mapPage(page);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public Page<ReportListResponse> getReportsByDepartment(String departmentId, AppUser user, Pageable pageable) {
        // Eğer kullanıcının bir departmanı varsa, yalnızca kendi departmanının ihbarlarını görebilir.
        String effectiveDeptId = user.getDepartment() != null ? user.getDepartment().getId() : departmentId;
        Page<Report> page;
        if (tenantAccess.isSuperAdmin(user)) {
            page = reportRepository.findByCategoryDepartmentIdAndHiddenFromMunicipalityFalse(effectiveDeptId, pageable);
        } else {
            String muniId = tenantAccess.requireStaffMunicipalityId(user);
            if (user.getMunicipality() != null && user.getMunicipality().getWorkflowMode() == com.burak.belediyeapp.entity.WorkflowMode.DEPARTMENTAL) {
                page = reportRepository.findByForwardedDepartmentIdAndMunicipalityIdAndHiddenFromMunicipalityFalse(effectiveDeptId, muniId, pageable);
            } else {
                page = reportRepository.findByCategoryDepartmentIdAndMunicipalityIdAndHiddenFromMunicipalityFalse(effectiveDeptId, muniId, pageable);
            }
        }
        return mapPage(page);
    }

    private ReportResponse maskReporterDetails(ReportResponse response) {
        return new ReportResponse(
                response.id(),
                response.title(),
                response.description(),
                response.status(),
                response.categoryName(),
                "Gizli Vatandaş",
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
                response.duplicateGroupId(),
                response.duplicateGroupSize(),
                response.forwardedDepartmentId(),
                response.forwardedDepartmentName(),
                response.forwardedAt(),
                response.forwardedByName(),
                response.trackingNumber(),
                response.qrCodeBase64(),
                response.processedAt(),
                response.slaBreached()
        );
    }

    @Transactional(readOnly = true)
    public ReportResponse getReportById(String reportId, AppUser currentUser) {
        Report report = reportSupport.findReportOrThrow(reportId);
        tenantAccess.ensureCanViewReport(report, currentUser);

        // Departman kontrolü: Departman görevlileri yalnızca kendi departmanına ait ihbarları görebilir
        if (currentUser != null && currentUser.getDepartment() != null) {
            if (currentUser.getMunicipality() != null && currentUser.getMunicipality().getWorkflowMode() == com.burak.belediyeapp.entity.WorkflowMode.DEPARTMENTAL) {
                if (report.getForwardedDepartment() == null || !report.getForwardedDepartment().getId().equals(currentUser.getDepartment().getId())) {
                    throw new BusinessException("Bu ihbar sizin departmanınıza yönlendirilmediği için erişim yetkiniz yoktur.", "DEPARTMENT_ACCESS_DENIED");
                }
            } else {
                if (report.getCategory() == null || report.getCategory().getDepartment() == null ||
                        !report.getCategory().getDepartment().getId().equals(currentUser.getDepartment().getId())) {
                    throw new BusinessException("Bu ihbar sizin departmanınıza ait olmadığından erişim yetkiniz yoktur.", "DEPARTMENT_ACCESS_DENIED");
                }
            }
        }

        boolean citizenView = tenantAccess.isCitizenOnly(currentUser);
        ReportResponse response = reportSupport.finalizeResponse(report, reportMapper.toResponse(report), citizenView);

        // Departman çalışanlarından vatandaş kimliğini gizle
        if (currentUser != null && currentUser.getDepartment() != null) {
            response = maskReporterDetails(response);
        }

        return response;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_WHITE_DESK')")
    public List<ReportListResponse> getDuplicateGroupMembers(String reportId, AppUser currentUser) {
        Report report = reportSupport.findReportOrThrow(reportId);
        tenantAccess.ensureCanViewReport(report, currentUser);
        String groupId = report.getDuplicateGroupId();
        if (groupId == null || groupId.isBlank()) {
            return List.of();
        }
        return mapList(duplicateLinkService.membersOfGroup(groupId, reportId));
    }

    @Transactional(readOnly = true)
    public List<ReportTimelineEntryResponse> getReportTimeline(String reportId, AppUser currentUser) {
        Report report = reportSupport.findReportOrThrow(reportId);
        tenantAccess.ensureCanViewReport(report, currentUser);
        boolean maskStaff = tenantAccess.isCitizenOnly(currentUser);
        String actorLabel = ReportLanguageMessages.municipalActorLabel(report.getContentLanguage());
        return historyRepository.findTimelineByReportId(reportId).stream()
                .map(h -> new ReportTimelineEntryResponse(
                        h.getCreatedAt(),
                        h.getOldStatus() != null ? h.getOldStatus().name() : null,
                        h.getNewStatus() != null ? h.getNewStatus().name() : null,
                        maskStaff
                                ? (h.getChangedBy() != null ? actorLabel : "Sistem")
                                : (h.getChangedBy() != null
                                        ? h.getChangedBy().getFirstName() + " " + h.getChangedBy().getLastName()
                                        : "Sistem"),
                        h.getNote()))
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_FIELD_OFFICER')")
    public Page<ReportListResponse> getMyAssignments(AppUser user, Pageable pageable) {
        String muniId = tenantAccess.requireStaffMunicipalityId(user);
        return mapPage(reportRepository.findByAssigneeIdAndMunicipalityIdAndHiddenFromMunicipalityFalse(user.getId(), muniId, pageable));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_CITIZEN')")
    public List<NearbyReportHintResponse> getNearbyHintsForCitizen(
            double latitude, double longitude, String municipalityId, double radiusMeters,
            AppUser currentUser) {
        // IDOR'a karşı: kullanıcının iddia ettiği belediye, kendi tercih ettiği
        // veya kayıtlı belediyesi olmak zorunda. Aksi halde başka kentin canlı
        // ihbar listesini görmesini engelleriz.
        String allowedMuni = resolveCitizenMunicipalityId(currentUser);
        String requested = (municipalityId == null || municipalityId.isBlank()) ? null : municipalityId.trim();
        String scope = requested != null ? requested : allowedMuni;
        if (scope == null) {
            return List.of();
        }
        if (allowedMuni != null && !allowedMuni.equals(scope)) {
            throw new BusinessException(
                    "Bu belediyeye ait yakın ihbar listesi görüntülenemez.",
                    "CROSS_MUNICIPALITY_HINT_ACCESS");
        }
        double radius = radiusMeters > 0 ? radiusMeters : 75;
        int maxRows = 5;
        List<Report> nearby = reportRepository.findActiveNearbyInMunicipality(
                latitude, longitude, radius, scope,
                "00000000-0000-0000-0000-000000000000", null, maxRows);
        return nearby.stream()
                .map(r -> new NearbyReportHintResponse(
                        r.getId(),
                        r.getTitle(),
                        r.getCategory().getName(),
                        r.getReportStatus().name(),
                        distanceMeters(latitude, longitude, r),
                        r.getCreatedAt()))
                .toList();
    }

    private static String resolveCitizenMunicipalityId(AppUser user) {
        if (user == null) return null;
        if (user.getPreferredMunicipality() != null) {
            return user.getPreferredMunicipality().getId();
        }
        if (user.getMunicipality() != null) {
            return user.getMunicipality().getId();
        }
        return null;
    }

    private static double distanceMeters(double lat, double lng, Report report) {
        if (report.getLocation() == null) {
            return 0;
        }
        double rLat = report.getLocation().getY();
        double rLng = report.getLocation().getX();
        double earth = 6371000;
        double dLat = Math.toRadians(rLat - lat);
        double dLng = Math.toRadians(rLng - lng);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat)) * Math.cos(Math.toRadians(rLat))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_WHITE_DESK')")
    public List<ReportListResponse> getNearbyReports(
            double latitude, double longitude, double radiusMeters, AppUser currentUser) {
        List<Report> reports = tenantAccess.staffMunicipalityScope(currentUser)
                .map(muniId -> reportRepository.findNearbyReportsByMunicipality(
                        latitude, longitude, radiusMeters, muniId))
                .orElseGet(() -> reportRepository.findNearbyReports(latitude, longitude, radiusMeters));
        return mapList(reports);
    }
}
