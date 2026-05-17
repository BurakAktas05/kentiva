package com.burak.belediyeapp.dto.response.setup;

public record SetupStatusResponse(
        boolean needsBootstrap,
        boolean bootstrapConfigured
) {
}
