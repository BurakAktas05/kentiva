package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.gamification.CreateRewardRequest;
import com.burak.belediyeapp.dto.request.gamification.RedeemRewardRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.gamification.RedeemedRewardResponse;
import com.burak.belediyeapp.dto.response.gamification.RewardResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.gamification.RewardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Ödüller & Gamification", description = "Vatandaş ödül ve katılım teşvik sistemi yönetimi")
public class RewardController {

    private final RewardService rewardService;

    // =====================================================
    //  Vatandaş Mobil Uygulaması Uç Noktaları
    // =====================================================

    @GetMapping("/api/v1/public/municipalities/{municipalityId}/rewards")
    @Operation(summary = "Belediyenin aktif ödüllerini listele (Vatandaş)")
    public ResponseEntity<ApiResponse<List<RewardResponse>>> getPublicRewards(
            @PathVariable String municipalityId) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.listForCitizen(municipalityId)));
    }

    @GetMapping("/api/v1/users/me/rewards/redeemed")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Kullanıcının aldığı ödül kuponlarını listele (Vatandaş)")
    public ResponseEntity<ApiResponse<List<RedeemedRewardResponse>>> getMyRedeemedRewards(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.listRedeemed(user)));
    }

    @PostMapping("/api/v1/users/me/rewards/redeem")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Ödül kuponu satın al/oluştur (Vatandaş)")
    public ResponseEntity<ApiResponse<RedeemedRewardResponse>> redeemReward(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody RedeemRewardRequest request) {
        RedeemedRewardResponse response = rewardService.redeem(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Ödül başarıyla alındı", response));
    }

    // =====================================================
    //  Yönetici Paneli (Admin) Uç Noktaları
    // =====================================================

    @GetMapping("/api/v1/municipalities/me/rewards")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Kendi belediyesinin tüm ödüllerini listele (Yönetici)")
    public ResponseEntity<ApiResponse<List<RewardResponse>>> getAdminRewards(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.listForAdmin(user)));
    }

    @PostMapping("/api/v1/municipalities/me/rewards")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Yeni ödül ekle (Yönetici)")
    public ResponseEntity<ApiResponse<RewardResponse>> createReward(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody CreateRewardRequest request) {
        RewardResponse saved = rewardService.create(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Ödül başarıyla eklendi", saved));
    }

    @PutMapping("/api/v1/municipalities/me/rewards/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Ödülü güncelle (Yönetici)")
    public ResponseEntity<ApiResponse<RewardResponse>> updateReward(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id,
            @Valid @RequestBody CreateRewardRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Ödül güncellendi", rewardService.update(id, request, user)));
    }

    @DeleteMapping("/api/v1/municipalities/me/rewards/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Ödülü sil (Yönetici)")
    public ResponseEntity<ApiResponse<Void>> deleteReward(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {
        rewardService.delete(id, user);
        return ResponseEntity.ok(ApiResponse.success("Ödül silindi", null));
    }

    @GetMapping("/api/v1/municipalities/me/rewards/claims")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Vatandaşların ödül taleplerini/kuponlarını listele (Yönetici)")
    public ResponseEntity<ApiResponse<Page<RedeemedRewardResponse>>> getClaims(
            @AuthenticationPrincipal AppUser user,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(rewardService.listClaimsForAdmin(user, pageable)));
    }

    @PatchMapping("/api/v1/municipalities/me/rewards/claims/{claimId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Ödül talebini onayla veya iptal et (Yönetici)")
    public ResponseEntity<ApiResponse<RedeemedRewardResponse>> updateClaimStatus(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String claimId,
            @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.success("Talep durumu güncellendi", rewardService.updateClaimStatus(claimId, status, user)));
    }
}
