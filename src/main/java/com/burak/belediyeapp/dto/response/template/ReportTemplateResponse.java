package com.burak.belediyeapp.dto.response.template;

import com.burak.belediyeapp.entity.ReportTemplate;

public record ReportTemplateResponse(
        String id,
        String templateKey,
        String title,
        String descriptionTemplate,
        String categoryId,
        String categoryName,
        String iconCode,
        int sortOrder,
        boolean global
) {
    public static ReportTemplateResponse from(ReportTemplate template) {
        return new ReportTemplateResponse(
                template.getId(),
                template.getTemplateKey(),
                template.getTitle(),
                template.getDescriptionTemplate(),
                template.getCategory().getId(),
                template.getCategory().getName(),
                template.getIconCode(),
                template.getSortOrder(),
                template.getMunicipality() == null
        );
    }
}
