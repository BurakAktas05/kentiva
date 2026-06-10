package com.burak.belediyeapp.dto.response.setup;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Public /setup/status yanıtı.
 *
 * - Platform zaten kurulmuşsa (needsBootstrap=false) yalnızca needsBootstrap döner;
 *   APP_SETUP_TOKEN'ın ayarlanıp ayarlanmadığı saldırgana sızdırılmaz.
 * - Kurulum gerekiyorsa installer UI'sı için bootstrapConfigured bilgisi dahil edilir.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SetupStatusResponse(
        boolean needsBootstrap,
        Boolean bootstrapConfigured
) {
}
