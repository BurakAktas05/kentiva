package com.burak.belediyeapp.dto.request.municipality;

/**
 * Belediye marka ve operasyon alanları — null alanlar değiştirilmez (PATCH).
 */
public record MunicipalityPatchRequest(
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
        String slug,
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
        String workflowMode
) {}
