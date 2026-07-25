package com.burak.belediyeapp.dto.request.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(

        @NotBlank(message = "E-posta veya telefon numarası boş bırakılamaz")
        String email,

        @NotBlank(message = "Şifre boş bırakılamaz")
        String password
) {}
