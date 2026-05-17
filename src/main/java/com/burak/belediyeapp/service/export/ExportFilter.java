package com.burak.belediyeapp.service.export;

import com.burak.belediyeapp.entity.ReportStatus;

import java.time.LocalDateTime;
import java.util.List;

public record ExportFilter(
        String municipalityId,
        ReportStatus status,
        LocalDateTime from,
        LocalDateTime to,
        List<String> reportIds
) {
    public static ExportFilter forMunicipality(String municipalityId) {
        return new ExportFilter(municipalityId, null, null, null, null);
    }
}
