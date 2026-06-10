package com.burak.belediyeapp.dto.request.widget;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record MunicipalityEventRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 200) String venue,
        @Size(max = 4000) String description,
        @NotNull LocalDateTime startsAt,
        LocalDateTime endsAt,
        @Size(max = 500) String externalUrl,
        Boolean active
) {}
