package com.burak.belediyeapp.dto.request.report;

import com.burak.belediyeapp.entity.ReportStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BulkUpdateReportStatusRequest(
        @NotEmpty(message = "En az bir rapor seçilmelidir")
        @Size(max = 100, message = "Tek seferde en fazla 100 rapor işlenebilir")
        List<@NotBlank String> reportIds,

        @NotNull(message = "Durum seçilmelidir")
        ReportStatus status,

        @Size(max = 500, message = "Açıklama en fazla 500 karakter olabilir")
        String note
) {}
