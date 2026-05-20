package com.burak.belediyeapp.dto.response.survey;

public record MunicipalitySurveyDetailDto(
        String id,
        String title,
        String description,
        String option1,
        String option2,
        String option3,
        String option4,
        boolean active,
        boolean voted,
        Integer votedOption,
        long option1Count,
        long option2Count,
        long option3Count,
        long option4Count,
        long totalVotes
) {}
