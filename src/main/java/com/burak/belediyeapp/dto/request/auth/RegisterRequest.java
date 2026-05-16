package com.burak.belediyeapp.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Vatandaş kayıt isteği.
 * Belediye personeli (field officer, manager) admin tarafından sisteme eklenir.
 */
public record RegisterRequest(

        @NotBlank(message = "Ad boş bırakılamaz")
        @Size(min = 2, max = 80)
        String firstName,

        @NotBlank(message = "Soyad boş bırakılamaz")
        @Size(min = 2, max = 80)
        String lastName,

        @NotBlank(message = "Email boş bırakılamaz")
        @Email(message = "Geçerli bir email adresi giriniz")
        String email,

        @NotBlank(message = "Şifre boş bırakılamaz")
        @Size(min = 8, message = "Şifre en az 8 karakter olmalıdır")
        String password,

        @NotBlank(message = "Telefon numarası zorunludur")
        @Size(min = 10, max = 20, message = "Geçerli bir telefon numarası giriniz")
        String phoneNumber
) {}
