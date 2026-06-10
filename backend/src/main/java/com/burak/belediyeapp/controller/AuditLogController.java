package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.audit.AuditLogResponse;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.audit.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Denetim Günlüğü", description = "Sistem denetim kayıtları — yalnızca yöneticiler")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Denetim kayıtlarını listele (sayfalanmış, filtreli)")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAll(
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String municipalityId,
            @PageableDefault(size = 30, sort = "createdAt") Pageable pageable) {

        Page<AuditLogResponse> result = auditLogService.search(
                currentUser, username, action, entityId, from, to, municipalityId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
