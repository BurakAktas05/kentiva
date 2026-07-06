package com.burak.belediyeapp.dto.request.report;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record WhiteDeskCreateReportRequest(
        @NotBlank(message = "Vatandas adi bos birakilamaz")
        @Size(max = 80, message = "Vatandas adi 80 karakteri asamaz")
        String reporterFirstName,

        @Size(max = 80, message = "Vatandas soyadi 80 karakteri asamaz")
        String reporterLastName,

        @Email(message = "Gecerli bir e-posta giriniz")
        @Size(max = 150, message = "E-posta 150 karakteri asamaz")
        String reporterEmail,

        @Size(max = 20, message = "Telefon 20 karakteri asamaz")
        String reporterPhoneNumber,

        @NotBlank(message = "Baslik bos birakilamaz")
        @Size(min = 10, max = 150, message = "Baslik 10 ile 150 karakter arasinda olmalidir")
        String title,

        @NotBlank(message = "Aciklama bos birakilamaz")
        @Size(min = 20, max = 2000, message = "Aciklama 20 ile 2000 karakter arasinda olmalidir")
        String description,

        @NotBlank(message = "Kategori secilmelidir")
        String categoryId,

        @NotNull(message = "Enlem gereklidir")
        @DecimalMin(value = "-90.0", message = "Enlem -90 ile 90 arasinda olmalidir")
        @DecimalMax(value = "90.0", message = "Enlem -90 ile 90 arasinda olmalidir")
        Double latitude,

        @NotNull(message = "Boylam gereklidir")
        @DecimalMin(value = "-180.0", message = "Boylam -180 ile 180 arasinda olmalidir")
        @DecimalMax(value = "180.0", message = "Boylam -180 ile 180 arasinda olmalidir")
        Double longitude,

        @Size(max = 100, message = "Bolge bilgisi 100 karakteri asamaz")
        String district,

        @Size(max = 3, message = "En fazla 3 medya dosyasi eklenebilir")
        List<@NotBlank(message = "Medya URL bos olamaz") @Size(max = 2048, message = "Medya URL cok uzun") String> mediaUrls,

        @NotNull(message = "KVKK onayi zorunludur")
        @AssertTrue(message = "Vatandasin sozlu/onayli KVKK rizasi alinmalidir")
        Boolean kvkkApproved,

        @Size(max = 500, message = "Riza notu 500 karakteri asamaz")
        String consentNote
) {
    @AssertTrue(message = "Vatandas icin telefon veya e-posta girilmelidir")
    public boolean isReporterContactPresent() {
        return hasText(reporterEmail) || hasText(reporterPhoneNumber);
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
