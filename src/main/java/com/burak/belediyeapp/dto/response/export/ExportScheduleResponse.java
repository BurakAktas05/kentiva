package com.burak.belediyeapp.dto.response.export;

import com.burak.belediyeapp.entity.ExportSchedule;

import java.time.LocalDateTime;

public record ExportScheduleResponse(
        String id,
        String format,
        String frequency,
        int hourOfDay,
        boolean enabled,
        LocalDateTime lastRunAt,
        LocalDateTime createdAt
) {
    public static ExportScheduleResponse from(ExportSchedule s) {
        return new ExportScheduleResponse(
                s.getId(),
                s.getFormat().name(),
                s.getFrequency().name(),
                s.getHourOfDay(),
                s.isEnabled(),
                s.getLastRunAt(),
                s.getCreatedAt());
    }
}
