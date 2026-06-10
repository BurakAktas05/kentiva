package com.burak.belediyeapp.dto.request.integration;

import jakarta.validation.constraints.Size;

public record WebhookSettingsRequest(
        @Size(max = 512) String webhookUrl,
        Boolean webhookEnabled,
        @Size(max = 64) String webhookSecret
) {}
