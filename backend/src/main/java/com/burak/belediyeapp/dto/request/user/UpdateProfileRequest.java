package com.burak.belediyeapp.dto.request.user;

import jakarta.validation.constraints.Size;

/**
 * Kullanıcının kendi profilini güncellemesi için request DTO.
 * Tüm alanlar opsiyoneldir — yalnızca gönderilen alanlar güncellenir.
 */
public record UpdateProfileRequest(

        @Size(min = 2, max = 80, message = "Ad 2 ile 80 karakter arasında olmalıdır")
        String firstName,

        @Size(min = 2, max = 80, message = "Soyad 2 ile 80 karakter arasında olmalıdır")
        String lastName,

        @Size(max = 20, message = "Telefon numarası en fazla 20 karakter olmalıdır")
        String phoneNumber
) {}
