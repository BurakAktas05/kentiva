package com.burak.belediyeapp.dto.response.report;

import java.time.LocalDateTime;

public record NearbyReportHintResponse(
        String id,
        String title,
        String categoryName,
        String status,
        double distanceMeters,
        LocalDateTime createdAt
) {}
