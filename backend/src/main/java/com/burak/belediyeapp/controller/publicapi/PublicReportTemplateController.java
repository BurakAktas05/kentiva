package com.burak.belediyeapp.controller.publicapi;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.department.DepartmentResponse;
import com.burak.belediyeapp.dto.response.template.ReportTemplateResponse;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.service.department.DepartmentService;
import com.burak.belediyeapp.service.template.ReportTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/municipalities")
@RequiredArgsConstructor
@Tag(name = "Public - Bildirim sablonlari", description = "Vatandas uygulamasi icin hizli sablonlar")
public class PublicReportTemplateController {

    private final ReportTemplateService reportTemplateService;
    private final IMunicipalityRepository municipalityRepository;
    private final DepartmentService departmentService;

    @GetMapping("/{slug}/report-templates")
    @Operation(summary = "Belediye slug ile birlesik sablon listesi")
    public ResponseEntity<ApiResponse<List<ReportTemplateResponse>>> listBySlug(
            @PathVariable String slug,
            @RequestParam(required = false) String departmentSlug) {
        Municipality municipality = municipalityRepository.findBySlugIgnoreCaseAndActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "slug", slug));
        if (departmentSlug != null && !departmentSlug.isBlank()) {
            DepartmentResponse department = departmentService.getPublicDepartmentContext(slug, departmentSlug.trim());
            return ResponseEntity.ok(ApiResponse.success(
                    reportTemplateService.listForCitizen(municipality.getId(), department.id())));
        }
        return ResponseEntity.ok(ApiResponse.success(reportTemplateService.listForCitizen(municipality.getId())));
    }

    @GetMapping("/report-templates")
    @Operation(summary = "Belediye kimligi ile sablon listesi")
    public ResponseEntity<ApiResponse<List<ReportTemplateResponse>>> listByMunicipalityId(
            @RequestParam("municipalityId") String municipalityId,
            @RequestParam(required = false) String departmentId) {
        municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        if (departmentId != null && !departmentId.isBlank()) {
            return ResponseEntity.ok(ApiResponse.success(
                    reportTemplateService.listForCitizen(municipalityId, departmentId.trim())));
        }
        return ResponseEntity.ok(ApiResponse.success(reportTemplateService.listForCitizen(municipalityId)));
    }
}
