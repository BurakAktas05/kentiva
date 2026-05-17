package com.burak.belediyeapp.dto.response.export;

import com.burak.belediyeapp.entity.ExportRun;

import java.time.LocalDateTime;

public record ExportRunResponse(
        String id,
        String scheduleId,
        String fileName,
        long byteSize,
        String status,
        LocalDateTime createdAt
) {
    public static ExportRunResponse from(ExportRun r) {
        return new ExportRunResponse(
                r.getId(),
                r.getSchedule() != null ? r.getSchedule().getId() : null,
                r.getFileName(),
                r.getByteSize(),
                r.getStatus().name(),
                r.getCreatedAt());
    }
}
