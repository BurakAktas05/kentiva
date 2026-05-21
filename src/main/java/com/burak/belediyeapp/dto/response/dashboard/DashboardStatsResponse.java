package com.burak.belediyeapp.dto.response.dashboard;

/**
 * Admin dashboard istatistikleri — özet bilgi kartları için.
 */
public record DashboardStatsResponse(
        long totalReports,
        long pendingReports,
        long processingReports,
        long resolvedReports,
        long rejectedReports,
        long forwardedReports,
        long totalUsers,
        long totalDepartments,
        long totalCategories
) {}
