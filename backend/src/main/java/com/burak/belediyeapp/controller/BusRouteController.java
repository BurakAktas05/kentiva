package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.transit.BusRouteDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.service.transit.BusRouteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Ulaşım / Otobüs Hatları", description = "Otobüs seferleri, AI hattı aktarma ve favoriler")
public class BusRouteController {

    private final BusRouteService busRouteService;

    // DTO for Star Stop Request
    public record StarStopRequest(String stopName, String municipalityId) {}

    @GetMapping("/public/municipalities/{municipalityId}/bus-routes")
    @Operation(summary = "Belediyenin aktif otobüs hatlarını listele (Kamuya Açık)")
    public ResponseEntity<ApiResponse<List<BusRouteDto>>> listRoutes(
            @PathVariable String municipalityId,
            @AuthenticationPrincipal AppUser currentUser) {
        return ResponseEntity.ok(ApiResponse.success(busRouteService.listRoutesForMunicipality(municipalityId, currentUser)));
    }

    @PostMapping(value = "/admin/municipalities/{id}/bus-routes/import", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Belediye için otobüs hatlarını PDF/Excel yükleyerek içe aktar (Süper Admin)")
    public ResponseEntity<ApiResponse<Void>> importRoutesSuperAdmin(
            @PathVariable String id,
            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        busRouteService.importRoutes(id, files);
        return ResponseEntity.ok(ApiResponse.success("Hatlar başarıyla içe aktarıldı ve AI tarafından işlendi.", null));
    }

    @PostMapping(value = "/municipalities/me/bus-routes/import", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Kendi belediyesi için otobüs hatlarını içe aktar (Belediye Admini)")
    public ResponseEntity<ApiResponse<Void>> importRoutesAdmin(
            @AuthenticationPrincipal AppUser user,
            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        if (user.getMunicipality() == null) {
            throw new BusinessException("Kullanıcı bir belediyeye bağlı değil.", "MUNICIPALITY_NOT_ASSIGNED");
        }
        busRouteService.importRoutes(user.getMunicipality().getId(), files);
        return ResponseEntity.ok(ApiResponse.success("Hatlar başarıyla içe aktarıldı ve AI tarafından işlendi.", null));
    }

    @PostMapping("/bus-routes/{routeId}/star")
    @Operation(summary = "Hattı yıldızla / favoriye ekle")
    public ResponseEntity<ApiResponse<Void>> starRoute(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String routeId) {
        busRouteService.starRoute(user, routeId);
        return ResponseEntity.ok(ApiResponse.success("Hat favorilere eklendi.", null));
    }

    @PostMapping("/bus-routes/{routeId}/unstar")
    @Operation(summary = "Hattı yıldızdan çıkar / favoriden kaldır")
    public ResponseEntity<ApiResponse<Void>> unstarRoute(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String routeId) {
        busRouteService.unstarRoute(user, routeId);
        return ResponseEntity.ok(ApiResponse.success("Hat favorilerden kaldırıldı.", null));
    }

    @GetMapping("/bus-routes/starred")
    @Operation(summary = "Kullanıcının yıldızlı / favori hatlarını getir")
    public ResponseEntity<ApiResponse<List<BusRouteDto>>> getStarredRoutes(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(busRouteService.getStarredRoutes(user)));
    }

    @PostMapping("/bus-stops/star")
    @Operation(summary = "Durağı yıldızla / favoriye ekle")
    public ResponseEntity<ApiResponse<Void>> starStop(
            @AuthenticationPrincipal AppUser user,
            @RequestBody StarStopRequest request) {
        busRouteService.starStop(user, request.stopName(), request.municipalityId());
        return ResponseEntity.ok(ApiResponse.success("Durak favorilere eklendi.", null));
    }

    @PostMapping("/bus-stops/unstar")
    @Operation(summary = "Durağı yıldızdan çıkar / favoriden kaldır")
    public ResponseEntity<ApiResponse<Void>> unstarStop(
            @AuthenticationPrincipal AppUser user,
            @RequestBody StarStopRequest request) {
        busRouteService.unstarStop(user, request.stopName(), request.municipalityId());
        return ResponseEntity.ok(ApiResponse.success("Durak favorilerden kaldırıldı.", null));
    }

    @GetMapping("/bus-stops/starred")
    @Operation(summary = "Kullanıcının yıldızlı / favori duraklarını getir")
    public ResponseEntity<ApiResponse<List<String>>> getStarredStops(
            @AuthenticationPrincipal AppUser user,
            @RequestParam String municipalityId) {
        return ResponseEntity.ok(ApiResponse.success(busRouteService.getStarredStops(user, municipalityId)));
    }
}
