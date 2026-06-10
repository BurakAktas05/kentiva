package com.burak.belediyeapp.dto.request.template;

import jakarta.validation.constraints.Size;

public record UpdateReportTemplateRequest(
        @Size(max = 100) String title,
        String descriptionTemplate,
        String categoryId,
        @Size(max = 50) String iconCode,
        Integer sortOrder,
        Boolean active
) {
}
