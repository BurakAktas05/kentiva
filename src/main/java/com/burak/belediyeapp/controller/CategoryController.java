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
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@Tag(name = "Kategoriler", description = "Rapor kategori yönetimi")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "Aktif kategorileri listele (Tüm Kullanıcılar)")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getActiveCategories() {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getActiveCategories()));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Tüm kategorileri listele (Admin)")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getAllCategories()));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Yeni kategori oluştur (Admin)")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CreateCategoryRequest request,
            @AuthenticationPrincipal com.burak.belediyeapp.entity.AppUser currentUser) {
        CategoryResponse response = categoryService.createCategory(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Kategori oluşturuldu", response));
    }

    @DeleteMapping("/{categoryId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Kategori sil (soft delete) (Admin)")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @PathVariable String categoryId,
            @AuthenticationPrincipal com.burak.belediyeapp.entity.AppUser currentUser) {
        categoryService.deleteCategory(categoryId, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Kategori devre dışı bırakıldı", null));
    }
}
