package com.burak.belediyeapp.controller.publicapi;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.publicapi.PublicMunicipalityDetailDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicProvinceDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicDistrictDto;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.service.publicapi.PublicMunicipalityService;
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
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@Tag(name = "Public — Coğrafi", description = "Kimlik doğrulamasız konum çözümleme ve coğrafi katalog")
public class PublicGeoController {

    private final PublicMunicipalityService publicMunicipalityService;

    @GetMapping("/municipality-at")
    @Operation(summary = "Koordinatın düştüğü aktif belediyeyi çözümle")
    public ResponseEntity<ApiResponse<PublicMunicipalityDetailDto>> municipalityAt(
            @RequestParam("lat") double lat,
            @RequestParam("lng") double lng) {
        return publicMunicipalityService.resolveByCoordinates(lat, lng)
                .map(d -> ResponseEntity.ok(ApiResponse.success(d)))
                .orElseThrow(() -> new BusinessException(
                        "Konumunuz platformdaki hiçbir aktif belediye sınırı içinde değil.",
                        "LOCATION_OUTSIDE_MUNICIPALITY"));
    }

    @GetMapping("/provinces")
    @Operation(summary = "İlleri listele")
    public ResponseEntity<ApiResponse<List<PublicProvinceDto>>> provinces() {
        return ResponseEntity.ok(ApiResponse.success(publicMunicipalityService.listProvinces()));
    }

    @GetMapping("/provinces/{plateCode}/districts")
    @Operation(summary = "İle ait ilçeleri listele")
    public ResponseEntity<ApiResponse<List<PublicDistrictDto>>> districts(@PathVariable String plateCode) {
        return ResponseEntity.ok(ApiResponse.success(publicMunicipalityService.listDistricts(plateCode)));
    }
}
