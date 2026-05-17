package com.burak.belediyeapp.dto.response.integration;

import com.burak.belediyeapp.entity.Municipality;

public record WebhookSettingsResponse(
        String webhookUrl,
        boolean webhookEnabled,
        boolean webhookSecretConfigured
) {
    public static WebhookSettingsResponse from(Municipality m) {
        return new WebhookSettingsResponse(
                m.getWebhookUrl(),
                m.isWebhookEnabled(),
                m.getWebhookSecret() != null && !m.getWebhookSecret().isBlank()
        );
    }
}
