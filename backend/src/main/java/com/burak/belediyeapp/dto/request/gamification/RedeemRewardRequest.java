package com.burak.belediyeapp.dto.request.gamification;

import jakarta.validation.constraints.NotBlank;

public record RedeemRewardRequest(
        @NotBlank String rewardId
) {}
