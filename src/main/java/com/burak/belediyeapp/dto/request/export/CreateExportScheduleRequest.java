package com.burak.belediyeapp.dto.request.export;

import com.burak.belediyeapp.entity.ExportSchedule;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateExportScheduleRequest(
        @NotNull ExportSchedule.ExportFormat format,
        @NotNull ExportSchedule.ExportFrequency frequency,
        @Min(0) @Max(23) int hourOfDay
) {}
