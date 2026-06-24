package com.burak.belediyeapp.dto.response.gamification;

public record RewardResponse(
        String id,
        String municipalityId,
        String municipalityName,
        String title,
        String description,
        int pointCost,
        int stock,
        String imageUrl,
        boolean active
) {}
