package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.ItemDonationAd;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IItemDonationAdRepository;
import com.burak.belediyeapp.security.RateLimit;
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
@Tag(name = "Eşya Bağış İlanları", description = "Vatandaşların eşya bağış duyuruları")
public class ItemDonationAdController {

    private static final int MAX_PUBLIC_LIST = 50;

    private final IItemDonationAdRepository itemDonationAdRepository;

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
            @NotBlank @Size(max = 150) String itemTitle,
            @NotBlank @Size(max = 100) String category,
            @NotBlank @Size(max = 100) String district,
            @Size(max = 50) String itemCondition,
            @NotBlank @Size(max = 30) String contactPhone,
            @Size(max = 2000) String description,
            @Size(max = 500) String mediaUrl
    ) {}

    private ItemDonationAdResponse mapToItemDonationResponse(ItemDonationAd ad, boolean revealContact) {
        return new ItemDonationAdResponse(
                ad.getId(),
                SocialAdPrivacy.publicUserId(ad.getUser().getId(), revealContact),
                ad.getUser().getFullName(),
                ad.getItemTitle(),
                ad.getCategory(),
                ad.getDistrict(),
                ad.getItemCondition(),
                SocialAdPrivacy.publicPhone(ad.getContactPhone(), revealContact),
                ad.getDescription(),
                ad.getMediaUrl(),
                ad.getCreatedAt()
        );
    }

    private List<ItemDonationAdResponse> listAds(String district, boolean revealContact) {
        List<ItemDonationAd> ads;
        if (district != null && !district.isBlank()) {
            ads = itemDonationAdRepository.findByDistrictOrderByCreatedAtDesc(district.trim());
        } else {
            ads = itemDonationAdRepository.findAllByOrderByCreatedAtDesc();
        }
        return ads.stream()
                .limit(MAX_PUBLIC_LIST)
                .map(ad -> mapToItemDonationResponse(ad, revealContact))
                .collect(Collectors.toList());
    }

    @GetMapping("/api/v1/public/social/item-donation-ads")
    @RateLimit(requests = 30, window = 60)
    @Operation(summary = "Eşya bağış ilanlarını listele (anonim — telefon maskeli)")
    public ResponseEntity<ApiResponse<List<ItemDonationAdResponse>>> getItemDonationAdsPublic(
            @RequestParam(required = false) String district) {
        return ResponseEntity.ok(ApiResponse.success(listAds(district, false)));
    }

    @GetMapping("/api/v1/social/item-donation-ads")
    @PreAuthorize("hasRole('CITIZEN')")
    @RateLimit(requests = 60, window = 60)
    @Operation(summary = "Eşya bağış ilanlarını listele (girişli)")
    public ResponseEntity<ApiResponse<List<ItemDonationAdResponse>>> getItemDonationAdsAuthenticated(
            @RequestParam(required = false) String district) {
        return ResponseEntity.ok(ApiResponse.success(listAds(district, true)));
    }

    @PostMapping("/api/v1/social/item-donation-ads")
    @PreAuthorize("hasRole('CITIZEN')")
    @RateLimit(requests = 10, window = 60)
    @Operation(summary = "Yeni eşya bağış ilanı oluştur (Vatandaş)")
    public ResponseEntity<ApiResponse<ItemDonationAdResponse>> createItemDonationAd(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody CreateItemDonationAdRequest request) {

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
                .body(ApiResponse.success("Eşya bağış ilanı yayınlandı", mapToItemDonationResponse(saved, true)));
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
