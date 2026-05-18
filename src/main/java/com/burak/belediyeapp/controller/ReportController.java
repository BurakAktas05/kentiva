package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.report.AssignReportRequest;
import com.burak.belediyeapp.dto.request.report.ReportDraftAnalysisRequest;
import com.burak.belediyeapp.dto.request.report.BulkAssignReportsRequest;
import com.burak.belediyeapp.dto.request.report.BulkUpdateReportStatusRequest;
import com.burak.belediyeapp.dto.request.report.CreateReportRequest;
import com.burak.belediyeapp.dto.request.report.UpdateReportStatusRequest;
import com.burak.belediyeapp.dto.response.report.BulkReportOperationResult;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.report.NearbyReportHintResponse;
import com.burak.belediyeapp.dto.response.report.ReportDraftAnalysisResponse;
import com.burak.belediyeapp.dto.response.report.ReportListResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.dto.response.report.ReportTimelineEntryResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.service.media.MediaGuardClient;
import com.burak.belediyeapp.service.report.ReportDraftAnalysisService;
import com.burak.belediyeapp.service.report.ReportService;
import com.burak.belediyeapp.service.storage.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Raporlar", description = "Vatandaş şikayet raporları yönetimi")
public class ReportController {

    private final ReportService reportService;
    private final ReportDraftAnalysisService draftAnalysisService;
    private final StorageService storageService;
    private final MediaGuardClient mediaGuardClient;

    @PostMapping("/upload")
    @Operation(summary = "Rapor için fotoğraf yükle (medya doğrulama ile)")
    public ResponseEntity<ApiResponse<List<String>>> uploadMedia(
            @RequestParam("files") List<MultipartFile> files) {

        List<String> urls = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                continue;
            }
            String ct = file.getContentType();
            if (ct == null || !ct.startsWith("image/")) {
                throw new BusinessException("Yalnızca görüntü dosyaları yüklenebilir.", "INVALID_MEDIA_TYPE");
            }
            if (file.getSize() > 12 * 1024 * 1024) {
                throw new BusinessException("Dosya boyutu 12 MB'ı aşamaz.", "FILE_TOO_LARGE");
            }
            byte[] bytes;
            try {
                bytes = file.getBytes();
            } catch (Exception e) {
                throw new BusinessException("Dosya okunamadı.", "FILE_READ_ERROR");
            }
            mediaGuardClient.validateImageOrThrow(bytes, ct);
            urls.add(storageService.uploadBytes(bytes, ct, "reports", file.getOriginalFilename()));
        }

        return ResponseEntity.ok(ApiResponse.success("Dosyalar yüklendi", urls));
    }

    @PostMapping("/analyze-draft")
    @Operation(summary = "İhbar taslağı AI analizi (Gemini veya kural tabanlı)")
    public ResponseEntity<ApiResponse<ReportDraftAnalysisResponse>> analyzeDraft(
            @Valid @RequestBody ReportDraftAnalysisRequest request,
            @AuthenticationPrincipal AppUser currentUser) {
        return ResponseEntity.ok(ApiResponse.success(draftAnalysisService.analyze(currentUser, request)));
    }

    @PostMapping
    @Operation(summary = "Yeni rapor oluştur (Vatandaş)")
    public ResponseEntity<ApiResponse<ReportResponse>> createReport(
            @Valid @RequestBody CreateReportRequest request,
            @AuthenticationPrincipal AppUser currentUser) {

        ReportResponse response = reportService.createReport(request, currentUser);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Raporunuz alındı, teşekkürler!", response));
    }

    @GetMapping("/my")
    @Operation(summary = "Kendi raporlarım (Vatandaş)")
    public ResponseEntity<ApiResponse<Page<ReportListResponse>>> getMyReports(
            @AuthenticationPrincipal AppUser currentUser,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {

        Page<ReportListResponse> page = reportService.getMyReports(currentUser, pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/my-assignments")
    @Operation(summary = "Bana atanan raporlar (Saha görevlisi)")
    public ResponseEntity<ApiResponse<Page<ReportListResponse>>> getMyAssignments(
            @AuthenticationPrincipal AppUser currentUser,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {

        Page<ReportListResponse> page = reportService.getMyAssignments(currentUser, pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping
    @Operation(summary = "Tüm raporlar (Saha Ekibi ve üzeri)")
    public ResponseEntity<ApiResponse<Page<ReportListResponse>>> getAllReports(
            @RequestParam(required = false) ReportStatus status,
            @AuthenticationPrincipal AppUser currentUser,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {

        Page<ReportListResponse> page = (status != null)
                ? reportService.getReportsByStatus(status, currentUser, pageable)
                : reportService.getAllReports(currentUser, pageable);

        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/nearby-hints")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Yakındaki aktif ihbarlar — çift kayıt uyarısı (Vatandaş)")
    public ResponseEntity<ApiResponse<List<NearbyReportHintResponse>>> getNearbyHints(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam String municipalityId,
            @RequestParam(defaultValue = "75") @Min(10) @Max(500) double radiusMeters,
            @AuthenticationPrincipal AppUser currentUser) {

        List<NearbyReportHintResponse> hints = reportService.getNearbyHintsForCitizen(
                latitude, longitude, municipalityId, radiusMeters, currentUser);
        return ResponseEntity.ok(ApiResponse.success(hints));
    }

    @GetMapping("/nearby")
    @Operation(summary = "Yakındaki raporlar — PostGIS spatial sorgu (Saha Ekibi)")
    public ResponseEntity<ApiResponse<List<ReportListResponse>>> getNearbyReports(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "1000") @Min(100) @Max(50000) double radiusMeters,
            @AuthenticationPrincipal AppUser currentUser) {

        List<ReportListResponse> result = reportService.getNearbyReports(latitude, longitude, radiusMeters, currentUser);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{reportId}/duplicate-group")
    @Operation(summary = "Aynı konum grubundaki diğer ihbarlar")
    public ResponseEntity<ApiResponse<List<ReportListResponse>>> getDuplicateGroup(
            @PathVariable String reportId,
            @AuthenticationPrincipal AppUser currentUser) {

        List<ReportListResponse> members = reportService.getDuplicateGroupMembers(reportId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(members));
    }

    @GetMapping("/{reportId}/timeline")
    @Operation(summary = "Rapor yaşam döngüsü zaman çizelgesi")
    public ResponseEntity<ApiResponse<List<ReportTimelineEntryResponse>>> getTimeline(
            @PathVariable String reportId,
            @AuthenticationPrincipal AppUser currentUser) {

        List<ReportTimelineEntryResponse> timeline = reportService.getReportTimeline(reportId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(timeline));
    }

    @GetMapping("/{reportId}")
    @Operation(summary = "Rapor detayı")
    public ResponseEntity<ApiResponse<ReportResponse>> getReportById(
            @PathVariable String reportId,
            @AuthenticationPrincipal AppUser currentUser) {

        ReportResponse response = reportService.getReportById(reportId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{reportId}/ai-analysis")
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Rapor için AI analizi ve vatandaş yanıt taslağı oluştur")
    public ResponseEntity<ApiResponse<ReportResponse>> runAiAnalysis(
            @PathVariable String reportId,
            @AuthenticationPrincipal AppUser currentUser) {

        reportService.performAiAnalysis(reportId, currentUser);
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
