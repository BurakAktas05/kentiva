package com.burak.belediyeapp.dto.request.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * Yönetici tarafından belediye personeli oluşturma isteği.
 * Vatandaş kaydından farklı olarak rol ve departman atanabilir.
 */
public record CreateStaffRequest(
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

        @Size(max = 20)
        String phoneNumber,

        Set<String> roleNames,

        String departmentId,
        String district
) {}
