package com.burak.belediyeapp.service.pilot;

import com.burak.belediyeapp.dto.response.pilot.PilotSuccessSummaryResponse;
import com.burak.belediyeapp.config.PilotProperties;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.report.ReportSupport;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PilotSuccessService {

    private final TenantAccessService tenantAccess;
    private final IMunicipalityRepository municipalityRepository;
    private final IReportRepository reportRepository;
    private final IAppUserRepository userRepository;
    private final PilotProperties pilotProperties;

    @Transactional(readOnly = true)
    @Cacheable(value = com.burak.belediyeapp.config.CacheNames.PILOT_STATS, key = "#currentUser.municipality != null ? #currentUser.municipality.id : 'none'")
    public PilotSuccessSummaryResponse getSummary(AppUser currentUser) {
        String municipalityId = tenantAccess.requireStaffMunicipalityId(currentUser);
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last7Days = now.minusDays(7);
        LocalDateTime last30Days = now.minusDays(30);

        long totalReports = reportRepository.countByMunicipalityIdAndHiddenFromMunicipalityFalse(municipalityId);
        long pendingReports = count(municipalityId, ReportStatus.PENDING);
        long processingReports = count(municipalityId, ReportStatus.PROCESSING);
        long forwardedReports = count(municipalityId, ReportStatus.FORWARDED);
        long resolvedReports = count(municipalityId, ReportStatus.RESOLVED);
        long rejectedReports = count(municipalityId, ReportStatus.REJECTED);
        long outOfJurisdictionReports = count(municipalityId, ReportStatus.OUT_OF_JURISDICTION);
        long openReports = pendingReports + processingReports + forwardedReports;
        long reportsLast7Days = reportRepository
                .countByMunicipalityIdAndHiddenFromMunicipalityFalseAndCreatedAtAfter(municipalityId, last7Days);
        long reportsLast30Days = reportRepository
                .countByMunicipalityIdAndHiddenFromMunicipalityFalseAndCreatedAtAfter(municipalityId, last30Days);
        long resolvedLast30Days = reportRepository
                .countByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalseAndCreatedAtAfter(
                        municipalityId, ReportStatus.RESOLVED, last30Days);

        long citizenUsers = Math.max(
                userRepository.countByPreferredMunicipalityId(municipalityId),
                reportRepository.countDistinctReportersByMunicipalityId(municipalityId));

        Double averageResolutionHours = roundOneDecimal(
                reportRepository.averageResolutionHoursByMunicipality(municipalityId));
        double resolutionRate = totalReports == 0 ? 0.0 : roundOneDecimal((resolvedReports * 100.0) / totalReports);

        List<PilotSuccessSummaryResponse.MetricRow> topCategories =
                reportRepository.findPilotTopCategories(municipalityId).stream()
                        .map(this::toMetricRow)
                        .toList();
        List<PilotSuccessSummaryResponse.MetricRow> topDistricts =
                reportRepository.findPilotTopDistricts(municipalityId).stream()
                        .map(this::toMetricRow)
                        .toList();
        List<PilotSuccessSummaryResponse.DepartmentRow> departmentRows =
                reportRepository.findPilotDepartmentPerformance(municipalityId).stream()
                        .map(this::toDepartmentRow)
                        .toList();

        Long daysRemaining = daysRemaining(municipality.getSubscriptionEndsAt());
        Integer trialTotalDays = trialTotalDays(municipality);
        Integer trialDay = trialDay(municipality, trialTotalDays);
        String summary = executiveSummary(
                municipality, citizenUsers, totalReports, resolvedReports, reportsLast7Days,
                reportsLast30Days, resolvedLast30Days, resolutionRate, topCategories);

        return new PilotSuccessSummaryResponse(
                municipality.getId(),
                ReportSupport.municipalityDisplayLabel(municipality),
                municipality.getSlug(),
                municipality.getSubscriptionPlan() != null ? municipality.getSubscriptionPlan().name() : null,
                municipality.getSubscriptionEndsAt(),
                daysRemaining,
                trialDay,
                trialTotalDays,
                citizenUsers,
                totalReports,
                openReports,
                pendingReports,
                processingReports,
                forwardedReports,
                resolvedReports,
                rejectedReports,
                outOfJurisdictionReports,
                reportsLast7Days,
                reportsLast30Days,
                resolvedLast30Days,
                resolutionRate,
                averageResolutionHours,
                topCategories,
                topDistricts,
                departmentRows,
                summary);
    }

    private long count(String municipalityId, ReportStatus status) {
        return reportRepository.countByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(
                municipalityId, status);
    }

    private PilotSuccessSummaryResponse.MetricRow toMetricRow(Object[] row) {
        return new PilotSuccessSummaryResponse.MetricRow(String.valueOf(row[0]), asLong(row[1]));
    }

    private PilotSuccessSummaryResponse.DepartmentRow toDepartmentRow(Object[] row) {
        return new PilotSuccessSummaryResponse.DepartmentRow(
                String.valueOf(row[0]),
                asLong(row[1]),
                asLong(row[2]),
                asLong(row[3]));
    }

    private long asLong(Object value) {
        return value instanceof Number n ? n.longValue() : Long.parseLong(String.valueOf(value));
    }

    private Double roundOneDecimal(Double value) {
        return value == null ? null : roundOneDecimal(value.doubleValue());
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private Long daysRemaining(LocalDateTime endsAt) {
        if (endsAt == null) {
            return null;
        }
        return ChronoUnit.DAYS.between(LocalDate.now(), endsAt.toLocalDate());
    }

    private Integer trialTotalDays(Municipality municipality) {
        if (municipality.getCreatedAt() == null || municipality.getSubscriptionEndsAt() == null) {
            return pilotProperties.effectiveTrialDays();
        }
        long total = ChronoUnit.DAYS.between(
                municipality.getCreatedAt().toLocalDate(),
                municipality.getSubscriptionEndsAt().toLocalDate());
        return (int) Math.max(1, total);
    }

    private Integer trialDay(Municipality municipality, Integer trialTotalDays) {
        if (municipality.getCreatedAt() == null || trialTotalDays == null) {
            return null;
        }
        long elapsed = ChronoUnit.DAYS.between(municipality.getCreatedAt().toLocalDate(), LocalDate.now()) + 1;
        return (int) Math.min(trialTotalDays, Math.max(1, elapsed));
    }

    private String executiveSummary(
            Municipality municipality,
            long citizenUsers,
            long totalReports,
            long resolvedReports,
            long reportsLast7Days,
            long reportsLast30Days,
            long resolvedLast30Days,
            double resolutionRate,
            List<PilotSuccessSummaryResponse.MetricRow> topCategories) {
        String topCategory = topCategories.isEmpty() ? "henuz yogun kategori olusmadi" : topCategories.get(0).label();
        return "%s pilotunda %d vatandas kullanici, %d toplam ihbar ve %d cozulmus ihbar gorunuyor. "
                .formatted(ReportSupport.municipalityDisplayLabel(municipality), citizenUsers, totalReports, resolvedReports)
                + "Son 7 gunde %d, son 30 gunde %d yeni ihbar alindi; son 30 gunde %d ihbar kapatildi. "
                .formatted(reportsLast7Days, reportsLast30Days, resolvedLast30Days)
                + "Cozum orani %s%% seviyesinde. En yogun baslik: %s."
                .formatted(resolutionRate, topCategory);
    }
}
