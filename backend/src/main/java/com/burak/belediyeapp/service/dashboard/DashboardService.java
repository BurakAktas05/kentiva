package com.burak.belediyeapp.service.dashboard;

import com.burak.belediyeapp.dto.response.dashboard.DashboardStatsResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.*;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final IReportRepository reportRepository;
    private final IAppUserRepository userRepository;
    private final IDepartmentRepository departmentRepository;
    private final IReportCategoryRepository categoryRepository;
    private final TenantAccessService tenantAccess;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats(AppUser user) {
        if (tenantAccess.isSuperAdmin(user)) {
            return new DashboardStatsResponse(
                    reportRepository.count(),
                    reportRepository.countByReportStatus(ReportStatus.PENDING),
                    reportRepository.countByReportStatus(ReportStatus.PROCESSING),
                    reportRepository.countByReportStatus(ReportStatus.RESOLVED),
                    reportRepository.countByReportStatus(ReportStatus.REJECTED),
                    reportRepository.countByReportStatus(ReportStatus.FORWARDED),
                    userRepository.count(),
                    departmentRepository.count(),
                    categoryRepository.count());
        }

        String municipalityId = tenantAccess.requireStaffMunicipalityId(user);

        long categoryCount =
                categoryRepository.countByMunicipality_Id(municipalityId)
                        + categoryRepository.countByMunicipalityIsNull();

        return new DashboardStatsResponse(
                reportRepository.countByMunicipalityIdAndHiddenFromMunicipalityFalse(municipalityId),
                reportRepository.countByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(municipalityId, ReportStatus.PENDING),
                reportRepository.countByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(municipalityId, ReportStatus.PROCESSING),
                reportRepository.countByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(municipalityId, ReportStatus.RESOLVED),
                reportRepository.countByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(municipalityId, ReportStatus.REJECTED),
                reportRepository.countByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(municipalityId, ReportStatus.FORWARDED),
                userRepository.countByMunicipalityId(municipalityId),
                departmentRepository.countByMunicipalityId(municipalityId),
                categoryCount);
    }
}
