package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.service.export.ExportFilter;
import com.burak.belediyeapp.service.export.ExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/export")
@RequiredArgsConstructor
@Tag(name = "Export", description = "Veri dışa aktarma servisleri")
public class ExportController {

    private final ExportService exportService;

    @GetMapping("/reports/excel")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    @Operation(summary = "Raporları Excel olarak indir")
    public ResponseEntity<byte[]> exportToExcel(
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) List<String> reportIds)
            throws IOException {
        return buildResponse(currentUser, status, from, to, reportIds, true);
    }

    @GetMapping("/reports/pdf")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    @Operation(summary = "Raporları PDF olarak indir")
    public ResponseEntity<byte[]> exportToPdf(
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) List<String> reportIds)
            throws IOException {
        return buildResponse(currentUser, status, from, to, reportIds, false);
    }

    private ResponseEntity<byte[]> buildResponse(
            AppUser currentUser,
            ReportStatus status,
            LocalDate from,
            LocalDate to,
            List<String> reportIds,
            boolean excel) throws IOException {
        String municipalityId;
        String municipalityName;
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            municipalityId = null;
            municipalityName = "tum";
        } else if (currentUser.getMunicipality() != null) {
            municipalityId = currentUser.getMunicipality().getId();
            municipalityName = currentUser.getMunicipality().getName();
        } else {
            throw new BusinessException("Dışa aktarma için belediye kapsamı gerekli.", "MUNICIPALITY_REQUIRED");
        }

        if (reportIds != null && reportIds.size() > 100) {
            throw new BusinessException("Tek seferde en fazla 100 rapor dışa aktarılabilir.", "BULK_EXPORT_LIMIT");
        }

        ExportFilter filter = new ExportFilter(
                municipalityId,
                status,
                from != null ? from.atStartOfDay() : null,
                to != null ? to.atTime(LocalTime.MAX) : null,
                reportIds);

        byte[] data = excel ? exportService.exportReportsToExcel(filter) : exportService.exportReportsToPdf(filter);
        String ext = excel ? "xlsx" : "pdf";
        String mime = excel
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : MediaType.APPLICATION_PDF_VALUE;
        String filename = municipalityName + "_raporlar." + ext;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType(mime))
                .body(data);
    }
}
