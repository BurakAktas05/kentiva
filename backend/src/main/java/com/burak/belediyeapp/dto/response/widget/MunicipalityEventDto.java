package com.burak.belediyeapp.dto.response.widget;

import java.time.LocalDateTime;

public record MunicipalityEventDto(
        String id,
        String title,
        String venue,
        String description,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        String externalUrl
) {}
