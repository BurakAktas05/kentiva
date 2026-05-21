package com.burak.belediyeapp.dto.response.export;

import com.burak.belediyeapp.entity.ExportSchedule;

import java.time.LocalDateTime;

public record ExportScheduleResponse(
        String id,
        String municipalityName,
        String format,
        String frequency,
        int hourOfDay,
        boolean enabled,
        LocalDateTime lastRunAt,
        LocalDateTime nextRunAt,
        LocalDateTime createdAt
) {
    public static ExportScheduleResponse from(ExportSchedule s, LocalDateTime nextRunAt) {
        return new ExportScheduleResponse(
                s.getId(),
                s.getMunicipality() != null ? s.getMunicipality().getName() : null,
                s.getFormat().name(),
                s.getFrequency().name(),
                s.getHourOfDay(),
                s.isEnabled(),
                s.getLastRunAt(),
                nextRunAt,
                s.getCreatedAt());
    }
}
