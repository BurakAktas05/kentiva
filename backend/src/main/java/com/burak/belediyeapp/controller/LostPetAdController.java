package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.LostPetAd;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.ILostPetAdRepository;
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
@Tag(name = "Kayıp Evcil Hayvan İlanları", description = "Vatandaşların kayıp evcil hayvan duyuruları")
public class LostPetAdController {

    private final ILostPetAdRepository lostPetAdRepository;

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
            String petName,
            String petType,
            String breed,
            String lastSeenDistrict,
            String contactPhone,
            String description,
            String mediaUrl
    ) {}

    private LostPetAdResponse mapToLostPetResponse(LostPetAd ad) {
        return new LostPetAdResponse(
                ad.getId(),
                ad.getUser().getId(),
                ad.getUser().getFullName(),
                ad.getPetName(),
                ad.getPetType(),
                ad.getBreed(),
                ad.getLastSeenDistrict(),
                ad.getContactPhone(),
                ad.getDescription(),
                ad.getMediaUrl(),
                ad.getCreatedAt()
        );
    }

    @GetMapping("/api/v1/public/social/lost-pet-ads")
    @Operation(summary = "Kayıp ilanlarını listele (Vatandaş)")
    public ResponseEntity<ApiResponse<List<LostPetAdResponse>>> getLostPetAds(
            @RequestParam(required = false) String district) {
        List<LostPetAd> ads;
        if (district != null && !district.isBlank()) {
            ads = lostPetAdRepository.findByLastSeenDistrictOrderByCreatedAtDesc(district.trim());
        } else {
            ads = lostPetAdRepository.findAllByOrderByCreatedAtDesc();
        }
        List<LostPetAdResponse> list = ads.stream()
                .map(this::mapToLostPetResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/api/v1/social/lost-pet-ads")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Yeni kayıp ilanı oluştur (Vatandaş)")
    public ResponseEntity<ApiResponse<LostPetAdResponse>> createLostPetAd(
            @AuthenticationPrincipal AppUser user,
            @RequestBody CreateLostPetAdRequest request) {

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
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Kayıp hayvan ilanı yayınlandı", mapToLostPetResponse(saved)));
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
