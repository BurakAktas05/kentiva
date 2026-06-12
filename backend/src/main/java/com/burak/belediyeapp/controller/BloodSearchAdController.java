package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.BloodSearchAd;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IBloodSearchAdRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@Tag(name = "Kan İlanları", description = "Vatandaşların acil kan arama ilanları")
public class BloodSearchAdController {

    private final IBloodSearchAdRepository bloodSearchAdRepository;

    public record BloodSearchAdResponse(
            String id,
            String userId,
            String userName,
            String bloodType,
            String hospitalName,
            String hospitalDistrict,
            String patientName,
            String contactPhone,
            String description,
            LocalDateTime createdAt
    ) {}

    public record CreateBloodAdRequest(
            String bloodType,
            String hospitalName,
            String hospitalDistrict,
            String patientName,
            String contactPhone,
            String description
    ) {}

    private BloodSearchAdResponse mapToBloodResponse(BloodSearchAd ad) {
        return new BloodSearchAdResponse(
                ad.getId(),
                ad.getUser().getId(),
                ad.getUser().getFullName(),
                ad.getBloodType(),
                ad.getHospitalName(),
                ad.getHospitalDistrict(),
                ad.getPatientName(),
                ad.getContactPhone(),
                ad.getDescription(),
                ad.getCreatedAt()
        );
    }

    @GetMapping("/api/v1/public/social/blood-ads")
    @Operation(summary = "Aktif kan ilanlarını listele (Vatandaş)")
    public ResponseEntity<ApiResponse<List<BloodSearchAdResponse>>> getBloodAds(
            @RequestParam(required = false) String district) {
        List<BloodSearchAd> ads;
        if (district != null && !district.isBlank()) {
            ads = bloodSearchAdRepository.findByHospitalDistrictOrderByCreatedAtDesc(district.trim());
        } else {
            ads = bloodSearchAdRepository.findAllByOrderByCreatedAtDesc();
        }
        List<BloodSearchAdResponse> list = ads.stream()
                .map(this::mapToBloodResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/api/v1/social/blood-ads")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Yeni kan ilanı oluştur (Vatandaş)")
    public ResponseEntity<ApiResponse<BloodSearchAdResponse>> createBloodAd(
            @AuthenticationPrincipal AppUser user,
            @RequestBody CreateBloodAdRequest request) {

        BloodSearchAd ad = BloodSearchAd.builder()
                .user(user)
                .bloodType(request.bloodType())
                .hospitalName(request.hospitalName())
                .hospitalDistrict(request.hospitalDistrict())
                .patientName(request.patientName())
                .contactPhone(request.contactPhone())
                .description(request.description())
                .build();

        BloodSearchAd saved = bloodSearchAdRepository.save(ad);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Kan ilanı yayınlandı", mapToBloodResponse(saved)));
    }

    @DeleteMapping("/api/v1/social/blood-ads/{id}")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Kendi kan ilanını sil (Vatandaş)")
    public ResponseEntity<ApiResponse<Void>> deleteBloodAd(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {

        BloodSearchAd ad = bloodSearchAdRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kan İlanı", "id", id));

        if (!ad.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Bu ilanı silme yetkiniz yok", "UNAUTHORIZED_ACCESS");
        }

        bloodSearchAdRepository.delete(ad);
        return ResponseEntity.ok(ApiResponse.success("Kan ilanı silindi", null));
    }
}
