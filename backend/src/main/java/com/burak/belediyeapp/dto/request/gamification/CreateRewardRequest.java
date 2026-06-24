package com.burak.belediyeapp.dto.request.gamification;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRewardRequest(
        @NotBlank @Size(max = 200) String title,
        String description,
        @Min(0) int pointCost,
        @Min(0) int stock,
        @Size(max = 500) String imageUrl,
        Boolean active
) {}
