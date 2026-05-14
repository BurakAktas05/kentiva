package com.burak.belediyeapp.dto.response.publicapi;

/**
 * Slug ile belediye detayı — iletişim kurumsal (belediye) bilgisidir.
 */
public record PublicMunicipalityDetailDto(
        String id,
        String slug,
        String displayName,
        String logoUrl,
        String primaryColor,
        String secondaryColor,
        String accentColor,
        String slogan,
        double centerLat,
        double centerLng,
        String contactEmail,
        String contactPhone,
        String websiteUrl,
        boolean active,
        boolean onboarded,
        boolean publicStatsEnabled
) {}
