package com.burak.belediyeapp.dto.response.report;

import java.time.LocalDateTime;

public record ReportListResponse(
        String id,
        String title,
        String status,
        String categoryName,
        Double latitude,
        Double longitude,
        LocalDateTime createdAt,
        String district,
        String aiPriority,
        String aiSlaRisk,
        String duplicateGroupId,
        Integer duplicateGroupSize,
        String municipalityName
) {}