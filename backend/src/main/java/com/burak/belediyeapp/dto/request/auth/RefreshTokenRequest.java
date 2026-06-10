package com.burak.belediyeapp.dto.request.auth;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(
        @NotBlank(message = "Refresh token boş bırakılamaz")
        String refreshToken
) {}
