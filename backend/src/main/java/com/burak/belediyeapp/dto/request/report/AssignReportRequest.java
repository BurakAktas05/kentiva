package com.burak.belediyeapp.dto.request.report;

import jakarta.validation.constraints.NotBlank;

public record AssignReportRequest(
        @NotBlank(message = "Atanacak kullanıcı ID'si gereklidir")
        String assigneeId
) {}
