package com.burak.belediyeapp.dto.response.publicapi;

public record PublicMunicipalityStatDto(
        String slug,
        String displayName,
        long totalReports,
        long resolvedReports
) {}
