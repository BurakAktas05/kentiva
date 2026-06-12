package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.report.BulkAssignReportsRequest;
import com.burak.belediyeapp.dto.request.report.BulkUpdateReportStatusRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.report.BulkReportOperationResult;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.report.ReportImportService;
import com.burak.belediyeapp.service.report.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Rapor Toplu İşlemler", description = "Birden fazla raporun toplu güncellenmesi ve atanması")
public class ReportBulkController {

    private final ReportService reportService;
    private final ReportImportService reportImportService;

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DEPT_MANAGER')")
    @Operation(summary = "Toplu rapor içe aktar (Excel/CSV) (Birim Müdürü ve üzeri)")
    public ResponseEntity<ApiResponse<BulkReportOperationResult>> importReports(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal AppUser currentUser) {

        BulkReportOperationResult result = reportImportService.importReports(file, currentUser);
        String message = result.failureCount() == 0
                ? result.successCount() + " rapor başarıyla içe aktarıldı"
                : result.successCount() + " aktarıldı, " + result.failureCount() + " başarısız";
        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    @PostMapping("/batch/assign")
    @Operation(summary = "Seçili raporları toplu ata (Birim Müdürü ve üzeri)")
    public ResponseEntity<ApiResponse<BulkReportOperationResult>> bulkAssignReports(
            @Valid @RequestBody BulkAssignReportsRequest request,
            @AuthenticationPrincipal AppUser currentUser) {

        BulkReportOperationResult result = reportService.bulkAssignReports(request, currentUser);
        String message = result.failureCount() == 0
                ? result.successCount() + " rapor atandı"
                : result.successCount() + " atandı, " + result.failureCount() + " başarısız";
        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    @PatchMapping("/batch/status")
    @Operation(summary = "Seçili raporların durumunu toplu güncelle (Saha Ekibi ve üzeri)")
    public ResponseEntity<ApiResponse<BulkReportOperationResult>> bulkUpdateStatus(
            @Valid @RequestBody BulkUpdateReportStatusRequest request,
            @AuthenticationPrincipal AppUser currentUser) {

        BulkReportOperationResult result = reportService.bulkUpdateReportStatus(request, currentUser);
        String message = result.failureCount() == 0
                ? result.successCount() + " rapor güncellendi"
                : result.successCount() + " güncellendi, " + result.failureCount() + " başarısız";
        return ResponseEntity.ok(ApiResponse.success(message, result));
    }
}
