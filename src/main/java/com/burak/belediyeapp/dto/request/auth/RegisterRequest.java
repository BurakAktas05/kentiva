package com.burak.belediyeapp.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Vatandas kayit istegi.
 * Belediye personeli (field officer, manager) admin tarafindan sisteme eklenir.
 * phoneNumber opsiyoneldir — vatandas kaydi icin zorunlu degil.
 */
public record RegisterRequest(

        @NotBlank(message = "Ad bos birakilamaz")
        @Size(min = 2, max = 80)
        String firstName,

        @NotBlank(message = "Soyad bos birakilamaz")
        @Size(min = 2, max = 80)
        String lastName,

        @NotBlank(message = "Email bos birakilamaz")
        @Email(message = "Gecerli bir email adresi giriniz")
        String email,

        @NotBlank(message = "Sifre bos birakilamaz")
        @Size(min = 8, message = "Sifre en az 8 karakter olmalidir")
        String password,

        @Size(max = 20, message = "Gecerli bir telefon numarasi giriniz")
        String phoneNumber
) {}
