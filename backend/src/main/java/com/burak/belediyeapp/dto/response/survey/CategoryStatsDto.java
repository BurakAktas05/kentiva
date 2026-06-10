package com.burak.belediyeapp.dto.response.survey;

public record CategoryStatsDto(
        String category,
        long surveyCount,
        long voteCount
) {}
