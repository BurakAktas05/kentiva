package com.burak.belediyeapp.dto.request.report;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateReportRequest(
        @NotBlank(message = "Başlık boş bırakılamaz")
        @Size(min = 10, max = 150, message = "Başlık 10 ile 150 karakter arasında olmalıdır")
        String title,

        @NotBlank(message = "Açıklama boş bırakılamaz")
        @Size(min = 20, max = 2000, message = "Açıklama 20 ile 2000 karakter arasında olmalıdır")
        String description,

        @NotBlank(message = "Kategori seçilmelidir")
        String categoryId,

        @NotNull(message = "Enlem (Latitude) gereklidir")
        @DecimalMin(value = "-90.0", message = "Enlem -90 ile 90 arasında olmalıdır")
        @DecimalMax(value = "90.0", message = "Enlem -90 ile 90 arasında olmalıdır")
        Double latitude,

        @NotNull(message = "Boylam (Longitude) gereklidir")
        @DecimalMin(value = "-180.0", message = "Boylam -180 ile 180 arasında olmalıdır")
        @DecimalMax(value = "180.0", message = "Boylam -180 ile 180 arasında olmalıdır")
        Double longitude,

        String district,

        @Size(max = 5, message = "En fazla 5 medya dosyası eklenebilir")
        List<@NotBlank(message = "Medya URL boş olamaz") @Size(max = 2048, message = "Medya URL çok uzun") String> mediaUrls,

        /**
         * Kentiva: vatandaşın seçtiği ilçe belediyesi. Kullanıcı hesabında belediye yoksa zorunludur;
         * konum bu belediye sınırlarıyla eşleşmelidir.
         */
        String targetMunicipalityId
) {}