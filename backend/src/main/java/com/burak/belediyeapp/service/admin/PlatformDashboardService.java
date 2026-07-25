package com.burak.belediyeapp.service.admin;

import com.burak.belediyeapp.dto.response.admin.PlatformDashboardResponse;
import com.burak.belediyeapp.dto.response.admin.ApiMetricResponse;
import com.burak.belediyeapp.config.CacheNames;
import com.burak.belediyeapp.entity.MembershipStatus;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.SubscriptionPlan;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.repository.IAppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
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
    @Cacheable(value = CacheNames.EXECUTIVE_DASHBOARD)
    public PlatformDashboardResponse getDashboard() {
        List<Municipality> municipalities = municipalityRepository.findAll();

        // 2N → 3 sorgu: tüm belediyeler, tüm user sayıları (group by), tüm rapor sayıları (group by).
        java.util.Map<String, Long> userCounts = new java.util.HashMap<>();
        for (Object[] row : userRepository.countAllGroupedByMunicipality()) {
            userCounts.put((String) row[0], ((Number) row[1]).longValue());
        }
        java.util.Map<String, Long> reportCounts = new java.util.HashMap<>();
        for (Object[] row : reportRepository.countAllGroupedByMunicipality()) {
            reportCounts.put((String) row[0], ((Number) row[1]).longValue());
        }

        List<PlatformDashboardResponse.TenantRow> tenants = new ArrayList<>();

        long active = 0;
        long trial = 0;
        long expiring = 0;
        long expired = 0;
        long suspended = 0;
        long totalUsers = 0;
        long totalReports = 0;

        for (Municipality m : municipalities) {
            long userCount = userCounts.getOrDefault(m.getId(), 0L);
            long reportCount = reportCounts.getOrDefault(m.getId(), 0L);
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

    @Transactional(readOnly = true)
    public List<ApiMetricResponse> getApiMetrics() {
        long totalUsers = userRepository.count();
        long totalReports = reportRepository.count();

        // Estimated usage from volume heuristics — not live provider metering.
        // Prefer real counters when billing APIs are wired; until then label clearly.
        long smsIncurred = Math.max(10, (long)(totalUsers * 1.8 + totalReports * 0.5));
        double smsCost = smsIncurred * 0.08;

        long mapsUsage = Math.max(50, totalReports * 4);
        double mapsCost = Math.max(0.0, (mapsUsage * 0.007) - 200.0);

        long pharmacyUsage = Math.max(30, totalUsers * 5);

        long geminiUsage = Math.max(20, totalReports * 2);
        double geminiCost = geminiUsage * 0.002;

        return List.of(
            new ApiMetricResponse("Google Maps API Suite (tahmini)", "Google Cloud Platform", mapsUsage, 50000, 142, mapsCost > 0 ? mapsCost : 0.0, 300.0, "ESTIMATED", "Canlı ölçüm yok", 94.2, 0.02),
            new ApiMetricResponse("Nöbetçi Eczane API (tahmini)", "Eczaneler.gen.tr", pharmacyUsage, 10000, 185, 0.0, 0.0, "ESTIMATED", "Canlı ölçüm yok", 98.4, 0.12),
            new ApiMetricResponse("Netgsm SMS OTP API (tahmini)", "Netgsm İletişim", smsIncurred, 100000, 95, smsCost, 500.0, "ESTIMATED", "Canlı ölçüm yok", 0.0, 0.08),
            new ApiMetricResponse("Gemini AI (tahmini)", "Google AI", geminiUsage, 15000, 750, geminiCost, 150.0, "ESTIMATED", "Canlı ölçüm yok", 35.0, 0.04),
            new ApiMetricResponse("Nominatim Geocoding (tahmini)", "OpenStreetMap", totalReports, 20000, 320, 0.0, 0.0, "ESTIMATED", "Canlı ölçüm yok", 85.3, 0.45)
        );
    }
}
