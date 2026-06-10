package com.burak.belediyeapp.dto.response.publicapi;

import java.time.LocalDateTime;

public record PublicResolvedReportDto(
        String id,
        String title,
        String description,
        String categoryName,
        String district,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt,
        String officialResolutionNote
) {}
