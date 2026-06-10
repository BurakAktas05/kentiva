package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.widget.MunicipalityEventRequest;
import com.burak.belediyeapp.dto.request.widget.MunicipalityOutageRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.widget.MunicipalityEventDto;
import com.burak.belediyeapp.dto.response.widget.MunicipalityOutageDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.widget.MunicipalityWidgetAdminService;
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
@RequestMapping("/api/v1/municipalities/me/widgets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Belediye widget yönetimi", description = "Kesinti ve kent etkinlikleri (resmi belediye duyuruları)")
public class MunicipalityWidgetsController {

    private final MunicipalityWidgetAdminService adminService;

    @GetMapping("/outages")
    @Operation(summary = "Planlı kesintileri listele")
    public ResponseEntity<ApiResponse<List<MunicipalityOutageDto>>> listOutages(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(adminService.listOutages(user)));
    }

    @PostMapping("/outages")
    @Operation(summary = "Planlı kesinti ekle")
    public ResponseEntity<ApiResponse<MunicipalityOutageDto>> createOutage(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody MunicipalityOutageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(adminService.createOutage(user, request)));
    }

    @PutMapping("/outages/{id}")
    @Operation(summary = "Planlı kesinti güncelle")
    public ResponseEntity<ApiResponse<MunicipalityOutageDto>> updateOutage(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id,
            @Valid @RequestBody MunicipalityOutageRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminService.updateOutage(user, id, request)));
    }

    @DeleteMapping("/outages/{id}")
    @Operation(summary = "Planlı kesinti sil")
    public ResponseEntity<ApiResponse<Void>> deleteOutage(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {
        adminService.deleteOutage(user, id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/events")
    @Operation(summary = "Kent etkinliklerini listele")
    public ResponseEntity<ApiResponse<List<MunicipalityEventDto>>> listEvents(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(adminService.listEvents(user)));
    }

    @PostMapping("/events")
    @Operation(summary = "Kent etkinliği ekle")
    public ResponseEntity<ApiResponse<MunicipalityEventDto>> createEvent(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody MunicipalityEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(adminService.createEvent(user, request)));
    }

    @PutMapping("/events/{id}")
    @Operation(summary = "Kent etkinliği güncelle")
    public ResponseEntity<ApiResponse<MunicipalityEventDto>> updateEvent(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id,
            @Valid @RequestBody MunicipalityEventRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminService.updateEvent(user, id, request)));
    }

    @DeleteMapping("/events/{id}")
    @Operation(summary = "Kent etkinliği sil")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {
        adminService.deleteEvent(user, id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
