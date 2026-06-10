package com.burak.belediyeapp.dto.request.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportDraftAnalysisRequest(
        @NotBlank String categoryId,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 5000) String description,
        @Size(max = 8) String contentLanguage,
        @Size(max = 512) String mediaUrl
) {}
