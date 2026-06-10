package com.burak.belediyeapp.dto.request.widget;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record MunicipalityOutageRequest(
        @NotBlank @Pattern(regexp = "WATER|ELECTRIC", message = "WATER veya ELECTRIC") String outageType,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 100) String district,
        @Size(max = 2000) String message,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        Boolean active
) {}
