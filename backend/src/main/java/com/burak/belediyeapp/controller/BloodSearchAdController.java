package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.BloodSearchAd;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IBloodSearchAdRepository;
import com.burak.belediyeapp.security.RateLimit;
import com.burak.belediyeapp.service.notification.BloodDonationNotificationService;
import com.burak.belediyeapp.util.SocialAdPrivacy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

    private static final int MAX_PUBLIC_LIST = 50;

    private final IBloodSearchAdRepository bloodSearchAdRepository;
    private final BloodDonationNotificationService bloodDonationNotificationService;

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
            @NotBlank @Size(max = 10) String bloodType,
            @NotBlank @Size(max = 150) String hospitalName,
            @NotBlank @Size(max = 100) String hospitalDistrict,
            @NotBlank @Size(max = 100) String patientName,
            @NotBlank @Size(max = 30) String contactPhone,
            @Size(max = 2000) String description
    ) {}

    private BloodSearchAdResponse mapToBloodResponse(BloodSearchAd ad, boolean revealContact) {
        return new BloodSearchAdResponse(
                ad.getId(),
                SocialAdPrivacy.publicUserId(ad.getUser().getId(), revealContact),
                ad.getUser().getFullName(),
                ad.getBloodType(),
                ad.getHospitalName(),
                ad.getHospitalDistrict(),
                SocialAdPrivacy.maskPersonName(ad.getPatientName(), revealContact),
                SocialAdPrivacy.publicPhone(ad.getContactPhone(), revealContact),
                ad.getDescription(),
                ad.getCreatedAt()
        );
    }

    private List<BloodSearchAdResponse> listAds(String district, boolean revealContact) {
        List<BloodSearchAd> ads;
        if (district != null && !district.isBlank()) {
            ads = bloodSearchAdRepository.findByHospitalDistrictOrderByCreatedAtDesc(district.trim());
        } else {
            ads = bloodSearchAdRepository.findAllByOrderByCreatedAtDesc();
        }
        return ads.stream()
                .limit(MAX_PUBLIC_LIST)
                .map(ad -> mapToBloodResponse(ad, revealContact))
                .collect(Collectors.toList());
    }

    @GetMapping("/api/v1/public/social/blood-ads")
    @RateLimit(requests = 30, window = 60)
    @Operation(summary = "Aktif kan ilanlarını listele (anonim — PII maskeli)")
    public ResponseEntity<ApiResponse<List<BloodSearchAdResponse>>> getBloodAdsPublic(
            @RequestParam(required = false) String district) {
        return ResponseEntity.ok(ApiResponse.success(listAds(district, false)));
    }

    @GetMapping("/api/v1/social/blood-ads")
    @PreAuthorize("hasRole('CITIZEN')")
    @RateLimit(requests = 60, window = 60)
    @Operation(summary = "Aktif kan ilanlarını listele (girişli)")
    public ResponseEntity<ApiResponse<List<BloodSearchAdResponse>>> getBloodAdsAuthenticated(
            @RequestParam(required = false) String district) {
        return ResponseEntity.ok(ApiResponse.success(listAds(district, true)));
    }

    @PostMapping("/api/v1/social/blood-ads")
    @PreAuthorize("hasRole('CITIZEN')")
    @RateLimit(requests = 10, window = 60)
    @Operation(summary = "Yeni kan ilanı oluştur (Vatandaş)")
    public ResponseEntity<ApiResponse<BloodSearchAdResponse>> createBloodAd(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody CreateBloodAdRequest request) {

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
        bloodDonationNotificationService.broadcast(saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Kan ilanı yayınlandı", mapToBloodResponse(saved, true)));
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
