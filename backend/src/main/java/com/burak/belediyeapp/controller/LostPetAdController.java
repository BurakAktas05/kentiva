package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.LostPetAd;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.ILostPetAdRepository;
import com.burak.belediyeapp.security.RateLimit;
import com.burak.belediyeapp.service.notification.LostPetNotificationService;
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
@Tag(name = "Kayıp Evcil Hayvan İlanları", description = "Vatandaşların kayıp evcil hayvan duyuruları")
public class LostPetAdController {

    private static final int MAX_PUBLIC_LIST = 50;

    private final ILostPetAdRepository lostPetAdRepository;
    private final LostPetNotificationService lostPetNotificationService;

    public record LostPetAdResponse(
            String id,
            String userId,
            String userName,
            String petName,
            String petType,
            String breed,
            String lastSeenDistrict,
            String contactPhone,
            String description,
            String mediaUrl,
            LocalDateTime createdAt
    ) {}

    public record CreateLostPetAdRequest(
            @NotBlank @Size(max = 100) String petName,
            @NotBlank @Size(max = 50) String petType,
            @Size(max = 100) String breed,
            @NotBlank @Size(max = 100) String lastSeenDistrict,
            @NotBlank @Size(max = 30) String contactPhone,
            @Size(max = 2000) String description,
            @Size(max = 500) String mediaUrl
    ) {}

    private LostPetAdResponse mapToLostPetResponse(LostPetAd ad, boolean revealContact) {
        return new LostPetAdResponse(
                ad.getId(),
                SocialAdPrivacy.publicUserId(ad.getUser().getId(), revealContact),
                ad.getUser().getFullName(),
                ad.getPetName(),
                ad.getPetType(),
                ad.getBreed(),
                ad.getLastSeenDistrict(),
                SocialAdPrivacy.publicPhone(ad.getContactPhone(), revealContact),
                ad.getDescription(),
                ad.getMediaUrl(),
                ad.getCreatedAt()
        );
    }

    private List<LostPetAdResponse> listAds(String district, boolean revealContact) {
        List<LostPetAd> ads;
        if (district != null && !district.isBlank()) {
            ads = lostPetAdRepository.findByLastSeenDistrictOrderByCreatedAtDesc(district.trim());
        } else {
            ads = lostPetAdRepository.findAllByOrderByCreatedAtDesc();
        }
        return ads.stream()
                .limit(MAX_PUBLIC_LIST)
                .map(ad -> mapToLostPetResponse(ad, revealContact))
                .collect(Collectors.toList());
    }

    @GetMapping("/api/v1/public/social/lost-pet-ads")
    @RateLimit(requests = 30, window = 60)
    @Operation(summary = "Kayıp ilanlarını listele (anonim — telefon maskeli)")
    public ResponseEntity<ApiResponse<List<LostPetAdResponse>>> getLostPetAdsPublic(
            @RequestParam(required = false) String district) {
        return ResponseEntity.ok(ApiResponse.success(listAds(district, false)));
    }

    @GetMapping("/api/v1/social/lost-pet-ads")
    @PreAuthorize("hasRole('CITIZEN')")
    @RateLimit(requests = 60, window = 60)
    @Operation(summary = "Kayıp ilanlarını listele (girişli — iletişim açık)")
    public ResponseEntity<ApiResponse<List<LostPetAdResponse>>> getLostPetAdsAuthenticated(
            @RequestParam(required = false) String district) {
        return ResponseEntity.ok(ApiResponse.success(listAds(district, true)));
    }

    @PostMapping("/api/v1/social/lost-pet-ads")
    @PreAuthorize("hasRole('CITIZEN')")
    @RateLimit(requests = 10, window = 60)
    @Operation(summary = "Yeni kayıp ilanı oluştur (Vatandaş)")
    public ResponseEntity<ApiResponse<LostPetAdResponse>> createLostPetAd(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody CreateLostPetAdRequest request) {

        LostPetAd ad = LostPetAd.builder()
                .user(user)
                .petName(request.petName())
                .petType(request.petType())
                .breed(request.breed())
                .lastSeenDistrict(request.lastSeenDistrict())
                .contactPhone(request.contactPhone())
                .description(request.description())
                .mediaUrl(request.mediaUrl())
                .build();

        LostPetAd saved = lostPetAdRepository.save(ad);
        lostPetNotificationService.broadcast(saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Kayıp hayvan ilanı yayınlandı", mapToLostPetResponse(saved, true)));
    }

    @DeleteMapping("/api/v1/social/lost-pet-ads/{id}")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Kendi kayıp ilanını sil (Vatandaş)")
    public ResponseEntity<ApiResponse<Void>> deleteLostPetAd(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {

        LostPetAd ad = lostPetAdRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kayıp İlanı", "id", id));

        if (!ad.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Bu ilanı silme yetkiniz yok", "UNAUTHORIZED_ACCESS");
        }

        lostPetAdRepository.delete(ad);
        return ResponseEntity.ok(ApiResponse.success("Kayıp ilanı silindi", null));
    }
}
