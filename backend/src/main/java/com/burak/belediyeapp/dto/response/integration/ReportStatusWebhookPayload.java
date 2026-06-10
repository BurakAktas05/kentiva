package com.burak.belediyeapp.dto.response.integration;

import java.time.LocalDateTime;

/**
 * Belediye ERP/CRM webhook gövdesi — rapor durumu değiştiğinde POST edilir.
 */
public record ReportStatusWebhookPayload(
        String event,
        LocalDateTime timestamp,
        String municipalityId,
        String reportId,
        String oldStatus,
        String newStatus,
        String title,
        String categoryName,
        String district,
        Double latitude,
        Double longitude,
        String note
) {}
