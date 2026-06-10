package com.burak.belediyeapp.dto.response.admin;

import com.burak.belediyeapp.entity.MembershipStatus;

import java.time.LocalDateTime;
import java.util.List;

public record PlatformDashboardResponse(
        PlatformSummary summary,
        List<TenantRow> tenants
) {
    public record PlatformSummary(
            long totalMunicipalities,
            long activeMunicipalities,
            long trialMunicipalities,
            long expiringWithin7Days,
            long expiredMunicipalities,
            long suspendedMunicipalities,
            long totalStaffUsers,
            long totalReports
    ) {}

    public record TenantRow(
            String id,
            String name,
            String displayName,
            String slug,
            boolean active,
            boolean onboarded,
            String subscriptionPlan,
            LocalDateTime subscriptionEndsAt,
            Long daysRemaining,
            MembershipStatus membershipStatus,
            long userCount,
            long reportCount,
            LocalDateTime createdAt
    ) {}
}
