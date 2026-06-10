package com.burak.belediyeapp.dto.request.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BulkAssignReportsRequest(
        @NotEmpty(message = "En az bir rapor seçilmelidir")
        @Size(max = 100, message = "Tek seferde en fazla 100 rapor işlenebilir")
        List<@NotBlank String> reportIds,

        @NotBlank(message = "Atanacak kullanıcı ID'si gereklidir")
        String assigneeId
) {}
