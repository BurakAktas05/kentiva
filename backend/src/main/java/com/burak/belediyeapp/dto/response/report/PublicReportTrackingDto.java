package com.burak.belediyeapp.dto.response.report;

import java.time.LocalDateTime;
import java.util.List;

public record PublicReportTrackingDto(
        String trackingNumber,
        String title,
        String status,
        String categoryName,
        String municipalityName,
        LocalDateTime createdAt,
        String district,
        List<String> mediaUrls,
        List<String> resolvedMediaUrls,
        String resolutionNote
) {}
