package com.burak.belediyeapp.dto.response.pilot;

import java.time.LocalDateTime;
import java.util.List;

public record PilotSuccessSummaryResponse(
        String municipalityId,
        String municipalityName,
        String municipalitySlug,
        String subscriptionPlan,
        LocalDateTime subscriptionEndsAt,
        Long daysRemaining,
        Integer trialDay,
        Integer trialTotalDays,
        long citizenUsers,
        long totalReports,
        long openReports,
        long pendingReports,
        long processingReports,
        long forwardedReports,
        long resolvedReports,
        long rejectedReports,
        long outOfJurisdictionReports,
        long reportsLast7Days,
        long reportsLast30Days,
        long resolvedLast30Days,
        double resolutionRate,
        Double averageResolutionHours,
        List<MetricRow> topCategories,
        List<MetricRow> topDistricts,
        List<DepartmentRow> departmentPerformance,
        String executiveSummary
) {
    public record MetricRow(String label, long count) {
    }

    public record DepartmentRow(String departmentName, long totalReports, long resolvedReports, long openReports) {
    }
}
