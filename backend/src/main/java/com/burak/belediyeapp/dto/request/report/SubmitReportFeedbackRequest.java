package com.burak.belediyeapp.dto.request.report;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SubmitReportFeedbackRequest(
        @NotNull(message = "Puan alanı boş bırakılamaz")
        @Min(value = 1, message = "Puan en az 1 olabilir")
        @Max(value = 5, message = "Puan en fazla 5 olabilir")
        Integer rating,

        @Size(max = 500, message = "Yorum en fazla 500 karakter olabilir")
        String comment
) {}
