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
        String smsSenderHeader,
        String smsProcessingTemplate,
        String pushProcessingTitleTemplate,
        String pushProcessingBodyTemplate,
        String smsAssignedTemplate,
        String pushAssignedTitleTemplate,
        String pushAssignedBodyTemplate,
        String workflowMode,
        Boolean allowMunicipalityRejection,
        Integer reputationDeltaReportCreated,
        Integer reputationDeltaReportResolved,
        Integer reputationDeltaReportRejected,
        Integer reputationDeltaInappropriateMedia,
        Integer autoSuspensionThreshold,
        Integer autoSuspensionDays,
        Boolean aiMediaModerationEnabled,
        String memberId,
        String plateCode,
        String provinceName
) {
    public static MunicipalityDto fromEntity(Municipality m) {
        return fromEntity(m, null);
    }

    public static MunicipalityDto fromEntity(Municipality m, com.burak.belediyeapp.service.media.MediaSignedUrlService signedUrlService) {
        if (m == null) {
            return null;
        }
        String display = m.getDisplayName() != null && !m.getDisplayName().isBlank()
                ? m.getDisplayName()
                : m.getName();

        String memberId = m.getDistrict() != null ? m.getDistrict().getMemberId() : null;
        String plateCode = m.getDistrict() != null && m.getDistrict().getProvince() != null 
                ? m.getDistrict().getProvince().getPlateCode() : null;
        String provinceName = m.getDistrict() != null && m.getDistrict().getProvince() != null 
                ? m.getDistrict().getProvince().getNameTr() : null;

        String logoUrl = m.getLogoUrl();
        if (signedUrlService != null && logoUrl != null && !logoUrl.isBlank()) {
            logoUrl = signedUrlService.signForClient(logoUrl);
        }

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
                logoUrl,
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
                m.getSmsSenderHeader(),
                m.getSmsProcessingTemplate(),
                m.getPushProcessingTitleTemplate(),
                m.getPushProcessingBodyTemplate(),
                m.getSmsAssignedTemplate(),
                m.getPushAssignedTitleTemplate(),
                m.getPushAssignedBodyTemplate(),
                m.getWorkflowMode() != null ? m.getWorkflowMode().name() : "SIMPLE",
                m.isAllowMunicipalityRejection(),
                m.getReputationDeltaReportCreated(),
                m.getReputationDeltaReportResolved(),
                m.getReputationDeltaReportRejected(),
                m.getReputationDeltaInappropriateMedia(),
                m.getAutoSuspensionThreshold(),
                m.getAutoSuspensionDays(),
                m.isAiMediaModerationEnabled(),
                memberId,
                plateCode,
                provinceName
        );
    }
}
