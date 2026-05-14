package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.export.ExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/export")
@RequiredArgsConstructor
@Tag(name = "Export", description = "Veri dışa aktarma servisleri")
public class ExportController {

    private final ExportService exportService;

    @GetMapping("/reports/excel")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    @Operation(summary = "Raporları Excel olarak indir")
    public ResponseEntity<byte[]> exportToExcel(@AuthenticationPrincipal AppUser currentUser) throws IOException {
        String municipalityId = null;
        String municipalityName = "tum";
        if (!currentUser.hasRole("ROLE_SUPER_ADMIN") && currentUser.getMunicipality() != null) {
            municipalityId = currentUser.getMunicipality().getId();
            municipalityName = currentUser.getMunicipality().getName();
        }
        
        byte[] data = exportService.exportReportsToExcel(municipalityId);

        String filename = municipalityName + "_raporlar.xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
