package com.burak.belediyeapp.dto.response.report;

import java.util.List;

public record BulkReportOperationResult(
        int successCount,
        int failureCount,
        List<BulkReportFailure> failures
) {
    public record BulkReportFailure(String reportId, String message) {}
}
