package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.outage.MunicipalityOutageRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.widget.MunicipalityOutageDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.outage.MunicipalityOutageService;
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
@RequestMapping("/api/v1/municipalities/me/widgets/outages")
@RequiredArgsConstructor
@Tag(name = "Belediye Kesinti Yönetimi", description = "Planlı kesintilerin (su/elektrik) yönetimi")
public class MunicipalityOutageController {

    private final MunicipalityOutageService outageService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DEPT_MANAGER')")
    @Operation(summary = "Belediyenin tüm kesintilerini listele (Yönetici)")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Kesintiler başarıyla listelendi")
    public ResponseEntity<ApiResponse<List<MunicipalityOutageDto>>> getOutages(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(outageService.listForAdmin(user)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Yeni planlı kesinti ekle (Yönetici)")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Kesinti başarıyla eklendi")
    public ResponseEntity<ApiResponse<MunicipalityOutageDto>> createOutage(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody MunicipalityOutageRequest request) {
        MunicipalityOutageDto saved = outageService.create(user, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Kesinti yayınlandı.", saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Planlı kesintiyi sil (Yönetici)")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Kesinti başarıyla silindi (soft-delete)")
    public ResponseEntity<ApiResponse<Void>> deleteOutage(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {
        outageService.delete(user, id);
        return ResponseEntity.ok(ApiResponse.success("Kesinti silindi.", null));
    }
}
