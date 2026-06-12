package com.burak.belediyeapp.dto.response.report;

import java.time.LocalDateTime;
import java.util.List;

public record ReportResponse(
        String id,
        String title,
        String description,
        String status,
        String categoryName,
        String reporterFullName,
        String assigneeFullName,
        Double latitude,
        Double longitude,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<String> mediaUrls,
        List<String> resolvedMediaUrls,
        String district,
        String aiPriority,
        String aiSummary,
        String aiSuggestedCategory,
        String aiSlaRisk,
        String aiReplyDraft,
        String aiDuplicateHint,
        String duplicateGroupId,
        Integer duplicateGroupSize,
        String forwardedDepartmentId,
        String forwardedDepartmentName,
        LocalDateTime forwardedAt,
        String forwardedByName,
        String trackingNumber,
        String qrCodeBase64,
        LocalDateTime processedAt,
        Boolean slaBreached
) {}