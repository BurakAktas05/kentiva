package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.announcement.MunicipalityAnnouncementRequest;
import com.burak.belediyeapp.dto.response.announcement.MunicipalityAnnouncementDto;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.announcement.MunicipalityAnnouncementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Belediye Duyuruları", description = "Duyuruların yönetimi ve listelenmesi")
public class AnnouncementController {

    private final MunicipalityAnnouncementService announcementService;

    @GetMapping("/api/v1/public/municipalities/{municipalityId}/announcements")
    @Operation(summary = "Belediyenin aktif duyurularını listele (Vatandaş)")
    public ResponseEntity<ApiResponse<List<MunicipalityAnnouncementDto>>> getPublicAnnouncements(
            @PathVariable String municipalityId) {
        return ResponseEntity.ok(ApiResponse.success(announcementService.listPublic(municipalityId)));
    }

    @GetMapping("/api/v1/municipalities/me/announcements")
    @PreAuthorize("hasAnyRole('ADMIN','DEPT_MANAGER')")
    @Operation(summary = "Kendi belediyesinin tüm duyurularını listele (Yönetici)")
    public ResponseEntity<ApiResponse<List<MunicipalityAnnouncementDto>>> getAdminAnnouncements(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(announcementService.listForAdmin(user)));
    }

    @PostMapping("/api/v1/municipalities/me/announcements")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Yeni duyuru yayınla (Yönetici)")
    public ResponseEntity<ApiResponse<MunicipalityAnnouncementDto>> createAnnouncement(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody MunicipalityAnnouncementRequest request) {
        MunicipalityAnnouncementDto saved = announcementService.create(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Duyuru yayınlandı", saved));
    }

    @PostMapping(value = "/api/v1/municipalities/me/announcements/image", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Duyuru gorseli yukle")
    public ResponseEntity<ApiResponse<String>> uploadAnnouncementImage(
            @AuthenticationPrincipal AppUser user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(
                ApiResponse.success("Duyuru gorseli yuklendi", announcementService.uploadImage(user, file)));
    }

    @PutMapping("/api/v1/municipalities/me/announcements/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Duyuruyu güncelle veya pasifleştir (Yönetici)")
    public ResponseEntity<ApiResponse<MunicipalityAnnouncementDto>> updateAnnouncement(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id,
            @Valid @RequestBody MunicipalityAnnouncementRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Duyuru güncellendi", announcementService.update(user, id, request)));
    }

    @DeleteMapping("/api/v1/municipalities/me/announcements/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Duyuruyu sil (Yönetici)")
    public ResponseEntity<ApiResponse<Void>> deleteAnnouncement(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {
        announcementService.delete(user, id);
        return ResponseEntity.ok(ApiResponse.success("Duyuru silindi", null));
    }
}
