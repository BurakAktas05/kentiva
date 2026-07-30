package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.category.CreateCategoryRequest;
import com.burak.belediyeapp.dto.response.category.CategoryResponse;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.service.category.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@Tag(name = "Kategoriler", description = "Rapor kategori yonetimi")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "Aktif kategorileri listele (global veya belediye kapsamli)")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getActiveCategories(
            @RequestParam(required = false) String municipalityId,
            @RequestParam(required = false) String departmentId) {
        if (municipalityId != null && !municipalityId.isBlank()) {
            if (departmentId != null && !departmentId.isBlank()) {
                return ResponseEntity.ok(ApiResponse.success(
                        categoryService.getActiveCategoriesForCitizenScope(
                                municipalityId.trim(),
                                departmentId.trim())));
            }
            return ResponseEntity.ok(ApiResponse.success(
                    categoryService.getActiveCategoriesForMunicipality(municipalityId.trim())));
        }
        return ResponseEntity.ok(ApiResponse.success(categoryService.getActiveCategories()));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Tum kategorileri listele (Admin)")
    public ResponseEntity<ApiResponse<Page<CategoryResponse>>> getAllCategories(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getAllCategories(pageable)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Yeni kategori olustur (Admin)")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CreateCategoryRequest request,
            @AuthenticationPrincipal com.burak.belediyeapp.entity.AppUser currentUser) {
        CategoryResponse response = categoryService.createCategory(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Kategori olusturuldu", response));
    }

    @DeleteMapping("/{categoryId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Kategori sil (soft delete)")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @PathVariable String categoryId,
            @AuthenticationPrincipal com.burak.belediyeapp.entity.AppUser currentUser) {
        categoryService.deleteCategory(categoryId, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Kategori devre disi birakildi", null));
    }
}
