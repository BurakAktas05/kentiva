package com.burak.belediyeapp.dto.request.announcement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record MunicipalityAnnouncementRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank String content,
        @Size(max = 500) String imageUrl,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        Boolean active
) {}
