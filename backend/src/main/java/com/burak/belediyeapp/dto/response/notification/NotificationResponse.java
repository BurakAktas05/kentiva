package com.burak.belediyeapp.dto.response.notification;

import java.time.LocalDateTime;

public record NotificationResponse(
        String id,
        String title,
        String body,
        String type,
        boolean read,
        String reportId,
        LocalDateTime createdAt
) {}
