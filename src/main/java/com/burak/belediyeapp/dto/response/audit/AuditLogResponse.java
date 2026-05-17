package com.burak.belediyeapp.dto.response.audit;

import java.time.LocalDateTime;

/**
 * Denetim günlüğü kayıtlarının API yanıt formatı.
 */
public record AuditLogResponse(
        String id,
        String username,
        String userId,
        String action,
        String description,
        String methodName,
        String ipAddress,
        String municipalityId,
        String entityId,
        String resultSummary,
        LocalDateTime createdAt
) {}
