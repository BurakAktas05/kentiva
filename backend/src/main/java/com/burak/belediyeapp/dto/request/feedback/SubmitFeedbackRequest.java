package com.burak.belediyeapp.dto.request.feedback;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SubmitFeedbackRequest {

    @Min(1)
    @Max(5)
    private int rating;

    @NotBlank
    private String content;
}
