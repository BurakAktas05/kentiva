package com.burak.belediyeapp.dto.response.announcement;

import java.time.LocalDateTime;

public record MunicipalityAnnouncementDto(
        String id,
        String title,
        String content,
        String imageUrl,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        boolean active
) {}
