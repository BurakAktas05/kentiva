package com.burak.belediyeapp.dto.response.export;

import com.burak.belediyeapp.entity.ExportRun;

import java.time.LocalDateTime;

public record ExportRunResponse(
        String id,
        String scheduleId,
        String municipalityName,
        String format,
        String fileName,
        long byteSize,
        String status,
        String errorMessage,
        LocalDateTime createdAt
) {
    public static ExportRunResponse from(ExportRun r) {
        return new ExportRunResponse(
                r.getId(),
                r.getSchedule() != null ? r.getSchedule().getId() : null,
                r.getMunicipality() != null ? r.getMunicipality().getName() : null,
                resolveFormat(r),
                r.getFileName(),
                r.getByteSize(),
                r.getStatus().name(),
                r.getErrorMessage(),
                r.getCreatedAt());
    }

    private static String resolveFormat(ExportRun run) {
        if (run.getSchedule() != null && run.getSchedule().getFormat() != null) {
            return run.getSchedule().getFormat().name();
        }
        if (run.getFileName() != null && run.getFileName().toLowerCase().endsWith(".pdf")) {
            return "PDF";
        }
        return "EXCEL";
    }
}
