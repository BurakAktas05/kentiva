package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.export.CreateExportScheduleRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.export.ExportRunResponse;
import com.burak.belediyeapp.dto.response.export.ExportScheduleResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.ExportRun;
import com.burak.belediyeapp.entity.ExportSchedule;
import com.burak.belediyeapp.service.export.ScheduledExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/v1/export/schedules")
@RequiredArgsConstructor
@Tag(name = "Export Schedules", description = "Planlı rapor dışa aktarma")
public class ExportScheduleController {

    private final ScheduledExportService scheduledExportService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    @Operation(summary = "Planlı export listesi")
    public ResponseEntity<ApiResponse<List<ExportScheduleResponse>>> list(
            @AuthenticationPrincipal AppUser user) {
        List<ExportScheduleResponse> data = scheduledExportService.listSchedules(user).stream()
                .map(schedule -> ExportScheduleResponse.from(
                        schedule,
                        scheduledExportService.calculateNextRunAt(schedule)))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Yeni planlı export oluştur")
    public ResponseEntity<ApiResponse<ExportScheduleResponse>> create(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody CreateExportScheduleRequest request) {
        ExportSchedule schedule = scheduledExportService.createSchedule(
                user,
                request.format(),
                request.frequency(),
                request.hourOfDay());
        return ResponseEntity.ok(ApiResponse.success(
                ExportScheduleResponse.from(schedule, scheduledExportService.calculateNextRunAt(schedule))));
    }

    @PostMapping("/{id}/run-now")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Planli exportu hemen calistir")
    public ResponseEntity<ApiResponse<ExportRunResponse>> runNow(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(
                ExportRunResponse.from(scheduledExportService.runNow(id, user))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Planlı export sil")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {
        scheduledExportService.deleteSchedule(id, user);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/runs")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    @Operation(summary = "Tamamlanan planlı export dosyaları")
    public ResponseEntity<ApiResponse<Page<ExportRunResponse>>> runs(
            @AuthenticationPrincipal AppUser user,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<ExportRunResponse> page = scheduledExportService.listRuns(user, pageable)
                .map(ExportRunResponse::from);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/runs/{runId}/download")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    @Operation(summary = "Planlı export dosyasını indir")
    public ResponseEntity<Resource> downloadRun(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String runId) throws Exception {
        ExportRun run = scheduledExportService.getRun(runId, user);

        Path path = Path.of(run.getStoragePath());
        if (!Files.exists(path)) {
            throw new com.burak.belediyeapp.exception.BusinessException("Dosya bulunamadı.", "FILE_NOT_FOUND");
        }
        Resource resource = new FileSystemResource(path);
        String mime = run.getFileName().endsWith(".pdf")
                ? MediaType.APPLICATION_PDF_VALUE
                : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + run.getFileName())
                .contentType(MediaType.parseMediaType(mime))
                .body(resource);
    }
}
