package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.template.CreateReportTemplateRequest;
import com.burak.belediyeapp.dto.request.template.UpdateReportTemplateRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.template.ReportTemplateResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.template.ReportTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/report-templates")
@RequiredArgsConstructor
@Tag(name = "Bildirim şablonları", description = "Sık kullanılan kategori + metin şablonları")
public class ReportTemplateController {

    private final ReportTemplateService reportTemplateService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Belediye / global şablon listesi (Admin)")
    public ResponseEntity<ApiResponse<List<ReportTemplateResponse>>> list(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(reportTemplateService.listForAdmin(user)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Yeni şablon oluştur")
    public ResponseEntity<ApiResponse<ReportTemplateResponse>> create(
            @Valid @RequestBody CreateReportTemplateRequest request,
            @AuthenticationPrincipal AppUser user) {
        ReportTemplateResponse created = reportTemplateService.create(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Şablon oluşturuldu", created));
    }

    @PatchMapping("/{templateId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Şablon güncelle")
    public ResponseEntity<ApiResponse<ReportTemplateResponse>> update(
            @PathVariable String templateId,
            @Valid @RequestBody UpdateReportTemplateRequest request,
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(reportTemplateService.update(templateId, request, user)));
    }

    @DeleteMapping("/{templateId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Şablonu devre dışı bırak")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String templateId,
            @AuthenticationPrincipal AppUser user) {
        reportTemplateService.delete(templateId, user);
        return ResponseEntity.ok(ApiResponse.success("Şablon devre dışı bırakıldı", null));
    }
}
