package com.burak.belediyeapp.dto.response.municipality;

import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.service.admin.MembershipStatusResolver;

/**
 * Oturum ve yönetim API'lerinde dönen belediye bilgisi (Kentiva markalama dahil).
 */
public record MunicipalityDto(
        String id,
        String name,
        String type,
        String parentId,
        Double centerLat,
        Double centerLng,
        Integer defaultZoom,
        String slug,
        String displayName,
        String logoUrl,
        String primaryColor,
        String secondaryColor,
        String accentColor,
        String slogan,
        String contactEmail,
        String contactPhone,
        String websiteUrl,
        Boolean publicStatsEnabled,
        Boolean active,
        Boolean onboarded,
        String subscriptionPlan,
        java.time.LocalDateTime subscriptionEndsAt,
        Long daysRemaining,
        String membershipStatus,
        String smsResolvedTemplate,
        String pushRejectedTitleTemplate,
        String pushRejectedBodyTemplate,
        String smsSenderHeader
) {
    public static MunicipalityDto fromEntity(Municipality m) {
        if (m == null) {
            return null;
        }
        String display = m.getDisplayName() != null && !m.getDisplayName().isBlank()
                ? m.getDisplayName()
                : m.getName();
        return new MunicipalityDto(
                m.getId(),
                m.getName(),
                m.getType().name(),
                m.getParentMunicipality() != null ? m.getParentMunicipality().getId() : null,
                m.getCenterLat(),
                m.getCenterLng(),
                m.getDefaultZoom(),
                m.getSlug(),
                display,
                m.getLogoUrl(),
                m.getPrimaryColor(),
                m.getSecondaryColor(),
                m.getAccentColor(),
                m.getSlogan(),
                m.getContactEmail(),
                m.getContactPhone(),
                m.getWebsiteUrl(),
                m.isPublicStatsEnabled(),
                m.isActive(),
                m.isOnboarded(),
                m.getSubscriptionPlan().name(),
                m.getSubscriptionEndsAt(),
                MembershipStatusResolver.daysRemaining(m.getSubscriptionEndsAt()),
                MembershipStatusResolver.resolve(m).name(),
                m.getSmsResolvedTemplate(),
                m.getPushRejectedTitleTemplate(),
                m.getPushRejectedBodyTemplate(),
                m.getSmsSenderHeader()
        );
    }
}
