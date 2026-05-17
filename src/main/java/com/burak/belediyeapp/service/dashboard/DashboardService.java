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
                    userRepository.count(),
                    departmentRepository.count(),
                    categoryRepository.count());
        }

        String municipalityId = tenantAccess.requireStaffMunicipalityId(user);

        long categoryCount =
                categoryRepository.countByMunicipality_Id(municipalityId)
                        + categoryRepository.countByMunicipalityIsNull();

        return new DashboardStatsResponse(
                reportRepository.countByMunicipalityId(municipalityId),
                reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.PENDING),
                reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.PROCESSING),
                reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.RESOLVED),
                reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.REJECTED),
                userRepository.countByMunicipalityId(municipalityId),
                departmentRepository.countByMunicipalityId(municipalityId),
                categoryCount);
    }
}
