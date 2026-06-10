package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.BloodSearchAd;
import com.burak.belediyeapp.entity.ItemDonationAd;
import com.burak.belediyeapp.entity.LostPetAd;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IBloodSearchAdRepository;
import com.burak.belediyeapp.repository.IItemDonationAdRepository;
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
@Tag(name = "Sosyal İlanlar", description = "Vatandaşların kan, kayıp hayvan ve eşya bağış ilanları")
public class SocialAdController {

    private final IBloodSearchAdRepository bloodSearchAdRepository;
    private final ILostPetAdRepository lostPetAdRepository;
    private final IItemDonationAdRepository itemDonationAdRepository;

    // --- DTO RECORDS ---

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

    public record CreateBloodAdRequest(
            String bloodType,
            String hospitalName,
            String hospitalDistrict,
            String patientName,
            String contactPhone,
            String description
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

    public record ItemDonationAdResponse(
            String id,
            String userId,
            String userName,
            String itemTitle,
            String category,
            String district,
            String itemCondition,
            String contactPhone,
            String description,
            String mediaUrl,
            LocalDateTime createdAt
    ) {}

    public record CreateItemDonationAdRequest(
            String itemTitle,
            String category,
            String district,
            String itemCondition,
            String contactPhone,
            String description,
            String mediaUrl
    ) {}

    // --- MAPPER METHODS ---

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

    private ItemDonationAdResponse mapToItemDonationResponse(ItemDonationAd ad) {
        return new ItemDonationAdResponse(
                ad.getId(),
                ad.getUser().getId(),
                ad.getUser().getFullName(),
                ad.getItemTitle(),
                ad.getCategory(),
                ad.getDistrict(),
                ad.getItemCondition(),
                ad.getContactPhone(),
                ad.getDescription(),
                ad.getMediaUrl(),
                ad.getCreatedAt()
        );
    }

    // --- BLOOD SEARCH AD ENDPOINTS ---

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

    // --- LOST PET AD ENDPOINTS ---

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

    // --- ITEM DONATION AD ENDPOINTS ---

    @GetMapping("/api/v1/public/social/item-donation-ads")
    @Operation(summary = "Eşya bağış ilanlarını listele (Vatandaş)")
    public ResponseEntity<ApiResponse<List<ItemDonationAdResponse>>> getItemDonationAds(
            @RequestParam(required = false) String district) {
        List<ItemDonationAd> ads;
        if (district != null && !district.isBlank()) {
            ads = itemDonationAdRepository.findByDistrictOrderByCreatedAtDesc(district.trim());
        } else {
            ads = itemDonationAdRepository.findAllByOrderByCreatedAtDesc();
        }
        List<ItemDonationAdResponse> list = ads.stream()
                .map(this::mapToItemDonationResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/api/v1/social/item-donation-ads")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Yeni eşya bağış ilanı oluştur (Vatandaş)")
    public ResponseEntity<ApiResponse<ItemDonationAdResponse>> createItemDonationAd(
            @AuthenticationPrincipal AppUser user,
            @RequestBody CreateItemDonationAdRequest request) {

        ItemDonationAd ad = ItemDonationAd.builder()
                .user(user)
                .itemTitle(request.itemTitle())
                .category(request.category())
                .district(request.district())
                .itemCondition(request.itemCondition())
                .contactPhone(request.contactPhone())
                .description(request.description())
                .mediaUrl(request.mediaUrl())
                .build();

        ItemDonationAd saved = itemDonationAdRepository.save(ad);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Eşya bağış ilanı yayınlandı", mapToItemDonationResponse(saved)));
    }

    @DeleteMapping("/api/v1/social/item-donation-ads/{id}")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Kendi eşya bağış ilanını sil (Vatandaş)")
    public ResponseEntity<ApiResponse<Void>> deleteItemDonationAd(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {

        ItemDonationAd ad = itemDonationAdRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Eşya Bağış İlanı", "id", id));

        if (!ad.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Bu ilanı silme yetkiniz yok", "UNAUTHORIZED_ACCESS");
        }

        itemDonationAdRepository.delete(ad);
        return ResponseEntity.ok(ApiResponse.success("Eşya bağış ilanı silindi", null));
    }
}
