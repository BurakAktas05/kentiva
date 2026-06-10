package com.burak.belediyeapp.dto.request.user;

import jakarta.validation.constraints.Size;

/**
 * Kullanıcının kendi şifresini değiştirmesi için request DTO.
 */
public record ChangePasswordRequest(

        @Size(min = 1, message = "Mevcut şifre boş bırakılamaz")
        String currentPassword,

        @Size(min = 8, message = "Yeni şifre en az 8 karakter olmalıdır")
        String newPassword
) {}
