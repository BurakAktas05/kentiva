package com.burak.belediyeapp.dto.response.survey;

import java.util.List;

public record SurveyAnalyticsDto(
        long totalSurveys,
        long activeSurveys,
        long totalVotes,
        List<CategoryStatsDto> categoryStats
) {}
