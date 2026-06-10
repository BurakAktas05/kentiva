package com.burak.belediyeapp.dto.request.report;

import com.burak.belediyeapp.entity.ReportStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateReportStatusRequest(
        @NotNull(message = "Durum seçilmelidir")
        ReportStatus status,

        @Size(max = 500, message = "Açıklama en fazla 500 karakter olabilir")
        String note
) {}