package com.burak.belediyeapp.controller.publicapi;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.service.widget.MunicipalityWidgetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.burak.belediyeapp.dto.response.widget.HomeWidgetsResponse;

@RestController
@RequestMapping("/api/v1/public/municipalities")
@RequiredArgsConstructor
@Tag(name = "Vatandaş widget", description = "Ana ekran belediye kartları")
public class PublicCitizenWidgetController {

    private final MunicipalityWidgetService widgetService;

    @GetMapping("/{municipalityId}/home-widgets")
    @Operation(summary = "Belediye ana ekran widget paketi (hava, nöbetçi eczane, kesinti, etkinlik)")
    public ResponseEntity<ApiResponse<HomeWidgetsResponse>> homeWidgets(
            @PathVariable String municipalityId,
            @RequestParam double lat,
            @RequestParam double lng) {
        return ResponseEntity.ok(ApiResponse.success(
                widgetService.homeBundle(municipalityId, lat, lng)));
    }
}
