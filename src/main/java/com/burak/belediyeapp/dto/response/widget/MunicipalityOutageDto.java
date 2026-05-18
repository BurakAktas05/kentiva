package com.burak.belediyeapp.dto.response.widget;

import java.time.LocalDateTime;

public record MunicipalityOutageDto(
        String id,
        String outageType,
        String title,
        String district,
        String message,
        LocalDateTime startsAt,
        LocalDateTime endsAt
) {}
