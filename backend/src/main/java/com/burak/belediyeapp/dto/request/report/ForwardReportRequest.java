package com.burak.belediyeapp.dto.request.report;

import jakarta.validation.constraints.NotBlank;

public record ForwardReportRequest(
    @NotBlank(message = "Departman seçimi zorunludur")
    String departmentId,
    String note
) {}
