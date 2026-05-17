package com.burak.belediyeapp.dto.response.dashboard;

public record PredictiveInsightDto(
        String categoryName,
        String district,
        long recentCount,
        long previousCount,
        long openCount,
        double trendRatio,
        String riskLevel,
        String recommendation
) {}
