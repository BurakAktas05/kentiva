package com.burak.belediyeapp.service.admin;

import com.burak.belediyeapp.dto.response.admin.PlatformDashboardResponse;
import com.burak.belediyeapp.entity.MembershipStatus;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.SubscriptionPlan;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.repository.IAppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PlatformDashboardService {

    private final IMunicipalityRepository municipalityRepository;
    private final IAppUserRepository userRepository;
    private final IReportRepository reportRepository;

    @Transactional(readOnly = true)
    public PlatformDashboardResponse getDashboard() {
        List<Municipality> municipalities = municipalityRepository.findAll();
        List<PlatformDashboardResponse.TenantRow> tenants = new ArrayList<>();

        long active = 0;
        long trial = 0;
        long expiring = 0;
        long expired = 0;
        long suspended = 0;
        long totalUsers = 0;
        long totalReports = 0;

        for (Municipality m : municipalities) {
            long userCount = userRepository.countByMunicipalityId(m.getId());
            long reportCount = reportRepository.countByMunicipalityId(m.getId());
            MembershipStatus status = MembershipStatusResolver.resolve(m);
            Long daysRemaining = MembershipStatusResolver.daysRemaining(m.getSubscriptionEndsAt());

            totalUsers += userCount;
            totalReports += reportCount;

            if (!m.isActive()) {
                suspended++;
            } else {
                active++;
            }
            if (m.getSubscriptionPlan() == SubscriptionPlan.TRIAL) {
                trial++;
            }
            if (status == MembershipStatus.EXPIRING_SOON) {
                expiring++;
            }
            if (status == MembershipStatus.EXPIRED) {
                expired++;
            }

            String display = m.getDisplayName() != null && !m.getDisplayName().isBlank()
                    ? m.getDisplayName()
                    : m.getName();

            tenants.add(new PlatformDashboardResponse.TenantRow(
                    m.getId(),
                    m.getName(),
                    display,
                    m.getSlug(),
                    m.isActive(),
                    m.isOnboarded(),
                    m.getSubscriptionPlan().name(),
                    m.getSubscriptionEndsAt(),
                    daysRemaining,
                    status,
                    userCount,
                    reportCount,
                    m.getCreatedAt()));
        }

        tenants.sort(Comparator
                .comparing((PlatformDashboardResponse.TenantRow t) -> t.daysRemaining() == null ? Long.MAX_VALUE : t.daysRemaining())
                .thenComparing(PlatformDashboardResponse.TenantRow::name));

        PlatformDashboardResponse.PlatformSummary summary = new PlatformDashboardResponse.PlatformSummary(
                municipalities.size(),
                active,
                trial,
                expiring,
                expired,
                suspended,
                totalUsers,
                totalReports);

        return new PlatformDashboardResponse(summary, tenants);
    }
}
