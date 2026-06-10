package com.burak.belediyeapp.dto.request.template;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReportTemplateRequest(
        @NotBlank @Size(max = 50) String templateKey,
        @NotBlank @Size(max = 100) String title,
        @NotBlank String descriptionTemplate,
        @NotBlank String categoryId,
        @Size(max = 50) String iconCode,
        Integer sortOrder,
        Boolean global
) {
}
