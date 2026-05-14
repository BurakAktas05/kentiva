package com.burak.belediyeapp.service.dashboard;

import com.burak.belediyeapp.dto.response.dashboard.DashboardStatsResponse;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dashboard istatistik servisi.
 * Admin ve yöneticilere özet bilgi sunar.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final IReportRepository reportRepository;
    private final IAppUserRepository userRepository;
    private final IDepartmentRepository departmentRepository;
    private final IReportCategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats(com.burak.belediyeapp.entity.AppUser user) {
        String municipalityId = user.getMunicipality() != null ? user.getMunicipality().getId() : null;
        boolean isSuperAdmin = user.hasRole("ROLE_SUPER_ADMIN");

        if (municipalityId != null && !isSuperAdmin) {
            return new DashboardStatsResponse(
                    reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.PENDING) +
                    reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.PROCESSING) +
                    reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.RESOLVED) +
                    reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.REJECTED),
                    reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.PENDING),
                    reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.PROCESSING),
                    reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.RESOLVED),
                    reportRepository.countByMunicipalityIdAndReportStatus(municipalityId, ReportStatus.REJECTED),
                    userRepository.countByMunicipalityId(municipalityId),
                    departmentRepository.countByMunicipalityId(municipalityId),
                    categoryRepository.count()
            );
        }

        return new DashboardStatsResponse(
                reportRepository.count(),
                reportRepository.countByReportStatus(ReportStatus.PENDING),
                reportRepository.countByReportStatus(ReportStatus.PROCESSING),
                reportRepository.countByReportStatus(ReportStatus.RESOLVED),
                reportRepository.countByReportStatus(ReportStatus.REJECTED),
                userRepository.count(),
                departmentRepository.count(),
                categoryRepository.count()
        );
    }
}
