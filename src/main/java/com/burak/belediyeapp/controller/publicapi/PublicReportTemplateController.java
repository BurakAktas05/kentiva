package com.burak.belediyeapp.controller.publicapi;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.template.ReportTemplateResponse;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.service.template.ReportTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/municipalities")
@RequiredArgsConstructor
@Tag(name = "Public — Bildirim şablonları", description = "Vatandaş uygulaması için hızlı şablonlar")
public class PublicReportTemplateController {

    private final ReportTemplateService reportTemplateService;
    private final IMunicipalityRepository municipalityRepository;

    @GetMapping("/{slug}/report-templates")
    @Operation(summary = "Belediye slug ile birleşik şablon listesi")
    public ResponseEntity<ApiResponse<List<ReportTemplateResponse>>> listBySlug(@PathVariable String slug) {
        Municipality municipality = municipalityRepository.findBySlugIgnoreCaseAndActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "slug", slug));
        return ResponseEntity.ok(ApiResponse.success(reportTemplateService.listForCitizen(municipality.getId())));
    }

    @GetMapping("/report-templates")
    @Operation(summary = "Belediye kimliği ile şablon listesi")
    public ResponseEntity<ApiResponse<List<ReportTemplateResponse>>> listByMunicipalityId(
            @RequestParam("municipalityId") String municipalityId) {
        municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        return ResponseEntity.ok(ApiResponse.success(reportTemplateService.listForCitizen(municipalityId)));
    }
}
