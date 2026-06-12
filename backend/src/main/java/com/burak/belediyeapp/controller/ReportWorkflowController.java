package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.report.AssignReportRequest;
import com.burak.belediyeapp.dto.request.report.UpdateReportStatusRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.report.ReportListResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.dto.response.report.ReportTimelineEntryResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.service.report.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Rapor İş Akışı", description = "Atama, yönlendirme, durum değişikliği ve zaman çizelgesi yönetimi")
public class ReportWorkflowController {

    private final ReportService reportService;

    @GetMapping("/my-assignments")
    @Operation(summary = "Bana atanan raporlar (Saha görevlisi)")
    public ResponseEntity<ApiResponse<Page<ReportListResponse>>> getMyAssignments(
            @AuthenticationPrincipal AppUser currentUser,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {

        Page<ReportListResponse> page = reportService.getMyAssignments(currentUser, pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/{reportId}/timeline")
    @Operation(summary = "Rapor yaşam döngüsü zaman çizelgesi")
    public ResponseEntity<ApiResponse<List<ReportTimelineEntryResponse>>> getTimeline(
            @PathVariable String reportId,
            @AuthenticationPrincipal AppUser currentUser) {

        List<ReportTimelineEntryResponse> timeline = reportService.getReportTimeline(reportId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(timeline));
    }

    @PostMapping("/{reportId}/ai-analysis")
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Rapor için AI analizi ve vatandaş yanıt taslağı oluştur")
    public ResponseEntity<ApiResponse<ReportResponse>> runAiAnalysis(
            @PathVariable String reportId,
            @RequestParam(required = false) ReportStatus status,
            @AuthenticationPrincipal AppUser currentUser) {

        reportService.performAiAnalysis(reportId, status, currentUser);
        ReportResponse response = reportService.getReportById(reportId, currentUser);
        return ResponseEntity.ok(ApiResponse.success("AI analizi tamamlandı", response));
    }

    @PatchMapping("/{reportId}/status")
    @Operation(summary = "Rapor durumunu güncelle (Saha Ekibi ve üzeri)")
    public ResponseEntity<ApiResponse<ReportResponse>> updateStatus(
            @PathVariable String reportId,
            @Valid @RequestBody UpdateReportStatusRequest request,
            @AuthenticationPrincipal AppUser currentUser) {

        ReportResponse response = reportService.updateReportStatus(reportId, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Durum güncellendi", response));
    }

    @PostMapping("/{reportId}/assign")
    @Operation(summary = "Saha ekibi ata (Birim Müdürü ve üzeri)")
    public ResponseEntity<ApiResponse<ReportResponse>> assignReport(
            @PathVariable String reportId,
            @Valid @RequestBody AssignReportRequest request,
            @AuthenticationPrincipal AppUser currentUser) {

        ReportResponse response = reportService.assignReport(reportId, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Rapor atandı", response));
    }

    @PostMapping("/{reportId}/forward")
    @Operation(summary = "Raporu departmana yönlendir (Beyaz Masa ve üzeri)")
    public ResponseEntity<ApiResponse<ReportResponse>> forwardReport(
            @PathVariable String reportId,
            @Valid @RequestBody com.burak.belediyeapp.dto.request.report.ForwardReportRequest request,
            @AuthenticationPrincipal AppUser currentUser) {

        ReportResponse response = reportService.forwardReportToDepartment(reportId, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Rapor yönlendirildi", response));
    }
}
