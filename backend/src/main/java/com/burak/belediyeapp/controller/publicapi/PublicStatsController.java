package com.burak.belediyeapp.controller.publicapi;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.publicapi.*;
import com.burak.belediyeapp.service.publicapi.PublicStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/stats")
@RequiredArgsConstructor
@Tag(name = "Public — İstatistikler", description = "Anonim toplu istatistikler")
public class PublicStatsController {

    private final PublicStatsService publicStatsService;

    @GetMapping
    @Operation(summary = "Genel özet")
    public ResponseEntity<ApiResponse<PublicStatsOverviewDto>> overview() {
        return ResponseEntity.ok(ApiResponse.success(publicStatsService.overview()));
    }

    @GetMapping("/categories")
    @Operation(summary = "Kategori dağılımı")
    public ResponseEntity<ApiResponse<List<PublicCategoryStatDto>>> categories() {
        return ResponseEntity.ok(ApiResponse.success(publicStatsService.byCategory()));
    }

    @GetMapping("/monthly")
    @Operation(summary = "Aylık açılan / çözülen")
    public ResponseEntity<ApiResponse<List<PublicMonthlyStatDto>>> monthly() {
        return ResponseEntity.ok(ApiResponse.success(publicStatsService.monthly()));
    }

    @GetMapping("/municipalities")
    @Operation(summary = "Kamu istatistiği açık belediyeler için özet")
    public ResponseEntity<ApiResponse<List<PublicMunicipalityStatDto>>> municipalities() {
        return ResponseEntity.ok(ApiResponse.success(publicStatsService.byMunicipality()));
    }
}
