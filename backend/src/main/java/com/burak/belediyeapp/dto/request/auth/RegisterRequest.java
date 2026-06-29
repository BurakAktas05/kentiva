package com.burak.belediyeapp.dto.request.auth;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Citizen registration request.
 * Municipality staff accounts are created by admins.
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

        @NotBlank(message = "Telefon numarasi zorunludur")
        @Size(max = 20, message = "Gecerli bir telefon numarasi giriniz")
        String phoneNumber,

        @NotBlank(message = "SMS dogrulama kodu zorunludur")
        @Size(min = 6, max = 6, message = "SMS dogrulama kodu 6 haneli olmalidir")
        String smsOtpCode,

        @NotNull(message = "KVKK onayi zorunludur")
        @AssertTrue(message = "Kisisel verilerin islenmesine onay vermeniz gerekmektedir")
        Boolean kvkkApproved,

        String tcNo,
        Integer birthYear
) {
    public RegisterRequest(String firstName, String lastName, String email, String password, String phoneNumber, Boolean kvkkApproved) {
        this(firstName, lastName, email, password, phoneNumber, null, kvkkApproved, null, null);
    }

    public RegisterRequest(String firstName, String lastName, String email, String password, String phoneNumber, String smsOtpCode, Boolean kvkkApproved) {
        this(firstName, lastName, email, password, phoneNumber, smsOtpCode, kvkkApproved, null, null);
    }
}
