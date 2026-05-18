package com.burak.belediyeapp.dto.response.report;

import java.util.List;

public record ReportDraftAnalysisResponse(
        String priority,
        String summary,
        String suggestedCategoryName,
        boolean categoryCorrect,
        String slaRisk,
        String priorityRationale,
        String analysisSource,
        List<String> steps
) {}
