package com.burak.belediyeapp.controller.publicapi;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.department.DepartmentResponse;
import com.burak.belediyeapp.service.department.DepartmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/municipalities/{municipalitySlug}/departments")
@RequiredArgsConstructor
@Tag(name = "Public - Departmanlar", description = "Kamuya acik departman yolu ve baglam cozumleme")
public class PublicDepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    @Operation(summary = "Belediyenin aktif departmanlarini listele")
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> list(@PathVariable String municipalitySlug) {
        return ResponseEntity.ok(ApiResponse.success(
                departmentService.getActiveDepartmentsForMunicipalitySlug(municipalitySlug)));
    }

    @GetMapping("/{departmentSlug}")
    @Operation(summary = "Belediye + departman slug ile departman baglamini cozumle")
    public ResponseEntity<ApiResponse<DepartmentResponse>> get(
            @PathVariable String municipalitySlug,
            @PathVariable String departmentSlug) {
        return ResponseEntity.ok(ApiResponse.success(
                departmentService.getPublicDepartmentContext(municipalitySlug, departmentSlug)));
    }
}
