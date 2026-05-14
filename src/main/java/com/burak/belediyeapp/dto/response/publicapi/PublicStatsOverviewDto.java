package com.burak.belediyeapp.dto.response.publicapi;

public record PublicStatsOverviewDto(
        long totalReports,
        long resolvedReports,
        double resolutionRatePercent,
        long onboardedMunicipalityCount
) {}
