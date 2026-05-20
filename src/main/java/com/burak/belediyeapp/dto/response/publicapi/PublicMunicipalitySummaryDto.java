package com.burak.belediyeapp.dto.response.publicapi;

/**
 * Kimlik doğrulamasız listeleme — kişisel veri içermez.
 */
public record PublicMunicipalitySummaryDto(
        String id,
        String slug,
        String displayName,
        String provinceName,
        String parentId,
        String logoUrl,
        String primaryColor,
        String secondaryColor,
        String accentColor,
        String slogan,
        double centerLat,
        double centerLng,
        boolean active,
        boolean onboarded
) {}
