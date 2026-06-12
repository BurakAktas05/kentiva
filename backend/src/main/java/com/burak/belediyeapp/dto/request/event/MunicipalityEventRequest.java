package com.burak.belediyeapp.dto.request.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public record MunicipalityEventRequest(
        @NotBlank(message = "Etkinlik başlığı zorunludur")
        @Size(max = 200, message = "Başlık en fazla 200 karakter olabilir")
        String title,

        @Size(max = 200, message = "Mekân en fazla 200 karakter olabilir")
        String venue,

        String description,

        @NotNull(message = "Başlangıç tarihi zorunludur")
        LocalDateTime startsAt,

        LocalDateTime endsAt,

        @Size(max = 500, message = "Harici URL en fazla 500 karakter olabilir")
        String externalUrl,

        Boolean active
) {}
