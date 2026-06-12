package com.burak.belediyeapp.dto.request.outage;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public record MunicipalityOutageRequest(
        @NotBlank(message = "Kesinti türü seçilmelidir")
        @Size(max = 20, message = "Kesinti türü en fazla 20 karakter olabilir")
        String outageType,

        @NotBlank(message = "Başlık zorunludur")
        @Size(max = 200, message = "Başlık en fazla 200 karakter olabilir")
        String title,

        @Size(max = 100, message = "Bölge en fazla 100 karakter olabilir")
        String district,

        String message,

        LocalDateTime startsAt,

        LocalDateTime endsAt,

        Boolean active
) {}
