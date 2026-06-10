package com.burak.belediyeapp.dto.request.municipality;

import jakarta.validation.constraints.NotNull;

public record GenerateNotificationTemplateRequest(
        @NotNull NotificationTemplateKind kind
) {
    public enum NotificationTemplateKind {
        SMS_RESOLVED,
        SMS_PROCESSING,
        SMS_ASSIGNED,
        PUSH_REJECTED_TITLE,
        PUSH_REJECTED_BODY,
        PUSH_PROCESSING_TITLE,
        PUSH_PROCESSING_BODY,
        PUSH_ASSIGNED_TITLE,
        PUSH_ASSIGNED_BODY
    }
}
