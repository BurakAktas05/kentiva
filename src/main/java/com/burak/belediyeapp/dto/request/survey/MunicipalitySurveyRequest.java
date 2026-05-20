package com.burak.belediyeapp.dto.request.survey;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MunicipalitySurveyRequest(
        @NotBlank @Size(max = 255) String title,
        String description,
        @NotBlank @Size(max = 150) String option1,
        @NotBlank @Size(max = 150) String option2,
        @Size(max = 150) String option3,
        @Size(max = 150) String option4,
        Boolean active
) {}
