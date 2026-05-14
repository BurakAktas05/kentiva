package com.burak.belediyeapp.controller.publicapi;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.publicapi.PublicMunicipalityDetailDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicMunicipalitySummaryDto;
import com.burak.belediyeapp.service.publicapi.PublicMunicipalityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/municipalities")
@RequiredArgsConstructor
@Tag(name = "Public — Belediyeler", description = "Kimlik doğrulamasız belediye listesi ve çözümleme")
public class PublicMunicipalityController {

    private final PublicMunicipalityService publicMunicipalityService;

    @GetMapping
    @Operation(summary = "Aktif ilçe belediyelerini listele")
    public ResponseEntity<ApiResponse<List<PublicMunicipalitySummaryDto>>> list() {
        return ResponseEntity.ok(ApiResponse.success(publicMunicipalityService.listDistrictMunicipalities()));
    }

    @GetMapping("/resolve")
    @Operation(summary = "Koordinatın düştüğü ilçe belediyesini çözümle")
    public ResponseEntity<ApiResponse<PublicMunicipalityDetailDto>> resolve(
            @RequestParam("lat") double lat,
            @RequestParam("lng") double lng) {
        return publicMunicipalityService.resolveByCoordinates(lat, lng)
                .map(d -> ResponseEntity.ok(ApiResponse.success(d)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.success(null)));
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Slug ile belediye detayı")
    public ResponseEntity<ApiResponse<PublicMunicipalityDetailDto>> bySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(publicMunicipalityService.getBySlug(slug)));
    }
}
