package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.event.MunicipalityEventRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.widget.MunicipalityEventDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.event.MunicipalityEventService;
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
@RequestMapping("/api/v1/municipalities/me/widgets/events")
@RequiredArgsConstructor
@Tag(name = "Belediye Etkinlik Yönetimi", description = "Belediye etkinliklerinin yönetimi")
public class MunicipalityEventController {

    private final MunicipalityEventService eventService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DEPT_MANAGER')")
    @Operation(summary = "Belediyenin tüm etkinliklerini listele (Yönetici)")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Etkinlikler başarıyla listelendi")
    public ResponseEntity<ApiResponse<List<MunicipalityEventDto>>> getEvents(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(eventService.listForAdmin(user)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Yeni belediye etkinliği ekle (Yönetici)")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Etkinlik başarıyla eklendi")
    public ResponseEntity<ApiResponse<MunicipalityEventDto>> createEvent(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody MunicipalityEventRequest request) {
        MunicipalityEventDto saved = eventService.create(user, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Etkinlik yayınlandı.", saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Belediye etkinliğini sil (Yönetici)")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Etkinlik başarıyla silindi (soft-delete)")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {
        eventService.delete(user, id);
        return ResponseEntity.ok(ApiResponse.success("Etkinlik silindi.", null));
    }
}
