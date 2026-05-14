package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.department.CreateDepartmentRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.department.DepartmentResponse;
import com.burak.belediyeapp.service.department.DepartmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
@Tag(name = "Departmanlar", description = "Departman yönetimi")
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    @Operation(summary = "Tüm departmanları listele")
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> getAllDepartments(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.burak.belediyeapp.entity.AppUser currentUser) {
        return ResponseEntity.ok(ApiResponse.success(departmentService.getAllDepartments(currentUser)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Yeni departman oluştur (Admin)")
    public ResponseEntity<ApiResponse<DepartmentResponse>> createDepartment(
            @Valid @RequestBody CreateDepartmentRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.burak.belediyeapp.entity.AppUser currentUser) {
        DepartmentResponse response = departmentService.createDepartment(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Departman oluşturuldu", response));
    }

    @PatchMapping("/{departmentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Departman güncelle (Admin)")
    public ResponseEntity<ApiResponse<DepartmentResponse>> updateDepartment(
            @PathVariable String departmentId,
            @Valid @RequestBody com.burak.belediyeapp.dto.request.department.UpdateDepartmentRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.burak.belediyeapp.entity.AppUser currentUser) {
        DepartmentResponse response = departmentService.updateDepartment(departmentId, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Departman güncellendi", response));
    }

    @DeleteMapping("/{departmentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Departman sil (soft delete) (Admin)")
    public ResponseEntity<ApiResponse<Void>> deleteDepartment(
            @PathVariable String departmentId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.burak.belediyeapp.entity.AppUser currentUser) {
        departmentService.deleteDepartment(departmentId, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Departman devre dışı bırakıldı", null));
    }
}
