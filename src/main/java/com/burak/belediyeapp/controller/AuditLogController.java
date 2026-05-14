package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.audit.AuditLogResponse;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AuditLog;
import com.burak.belediyeapp.repository.IAuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Denetim Günlüğü", description = "Sistem denetim kayıtları — yalnızca yöneticiler")
public class AuditLogController {

    private final IAuditLogRepository auditLogRepository;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Tüm denetim kayıtlarını listele (sayfalanmış)")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAll(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String action,
            @PageableDefault(size = 30, sort = "createdAt") Pageable pageable) {

        Page<AuditLog> page;

        if (username != null && action != null) {
            page = auditLogRepository.findByUsernameAndActionOrderByCreatedAtDesc(username, action, pageable);
        } else if (username != null) {
            page = auditLogRepository.findByUsernameOrderByCreatedAtDesc(username, pageable);
        } else if (action != null) {
            page = auditLogRepository.findByActionOrderByCreatedAtDesc(action, pageable);
        } else {
            page = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        Page<AuditLogResponse> result = page.map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getUsername(),
                log.getUserId(),
                log.getAction(),
                log.getDescription(),
                log.getMethodName(),
                log.getIpAddress(),
                log.getCreatedAt()
        );
    }
}
