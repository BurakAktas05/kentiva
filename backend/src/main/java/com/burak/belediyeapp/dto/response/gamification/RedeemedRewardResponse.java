package com.burak.belediyeapp.dto.response.gamification;

import java.time.LocalDateTime;

public record RedeemedRewardResponse(
        String id,
        String rewardId,
        String rewardTitle,
        String rewardImageUrl,
        String redemptionCode,
        String status,
        LocalDateTime redeemedAt,
        String userEmail,
        String userFullName,
        String userPhone,
        int pointCost
) {}
