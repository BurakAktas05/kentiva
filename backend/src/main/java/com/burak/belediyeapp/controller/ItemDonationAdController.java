package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.ItemDonationAd;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IItemDonationAdRepository;
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
@Tag(name = "Eşya Bağış İlanları", description = "Vatandaşların eşya bağış duyuruları")
public class ItemDonationAdController {

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
            String itemTitle,
            String category,
            String district,
            String itemCondition,
            String contactPhone,
            String description,
            String mediaUrl
    ) {}

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
