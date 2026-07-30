package com.burak.belediyeapp.service.gamification;

import com.burak.belediyeapp.dto.request.gamification.CreateRewardRequest;
import com.burak.belediyeapp.dto.request.gamification.RedeemRewardRequest;
import com.burak.belediyeapp.dto.response.gamification.RedeemedRewardResponse;
import com.burak.belediyeapp.dto.response.gamification.RewardResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.MunicipalityReward;
import com.burak.belediyeapp.entity.UserRedeemedReward;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalityRewardRepository;
import com.burak.belediyeapp.repository.IUserRedeemedRewardRepository;
import com.burak.belediyeapp.service.citizen.CitizenReputationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RewardService {

    private final IMunicipalityRewardRepository rewardRepository;
    private final IUserRedeemedRewardRepository redeemedRewardRepository;
    private final IAppUserRepository userRepository;
    private final CitizenReputationService citizenReputationService;

    @Transactional
    public RewardResponse create(CreateRewardRequest request, AppUser currentUser) {
        if (currentUser.getMunicipality() == null) {
            throw new BusinessException("Bu işlem için bir belediyeye bağlı olmalısınız.", "MUNICIPALITY_REQUIRED");
        }

        MunicipalityReward reward = MunicipalityReward.builder()
                .municipality(currentUser.getMunicipality())
                .title(request.title())
                .description(request.description())
                .pointCost(request.pointCost())
                .stock(request.stock())
                .imageUrl(request.imageUrl())
                .active(request.active() != null ? request.active() : true)
                .build();

        MunicipalityReward saved = rewardRepository.save(reward);
        log.info("Yeni ödül oluşturuldu: id={}, title={}, belediye={}", saved.getId(), saved.getTitle(), saved.getMunicipality().getDisplayName());
        return mapToResponse(saved);
    }

    @Transactional
    public RewardResponse update(String id, CreateRewardRequest request, AppUser currentUser) {
        MunicipalityReward reward = rewardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ödül", "id", id));

        if (currentUser.getMunicipality() == null || !reward.getMunicipality().getId().equals(currentUser.getMunicipality().getId())) {
            throw new BusinessException("Bu ödülü güncellemeye yetkiniz yok.", "ACCESS_DENIED");
        }

        reward.setTitle(request.title());
        reward.setDescription(request.description());
        reward.setPointCost(request.pointCost());
        reward.setStock(request.stock());
        reward.setImageUrl(request.imageUrl());
        if (request.active() != null) {
            reward.setActive(request.active());
        }

        MunicipalityReward saved = rewardRepository.save(reward);
        log.info("Ödül güncellendi: id={}, title={}", saved.getId(), saved.getTitle());
        return mapToResponse(saved);
    }

    @Transactional
    public void delete(String id, AppUser currentUser) {
        MunicipalityReward reward = rewardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ödül", "id", id));

        if (currentUser.getMunicipality() == null || !reward.getMunicipality().getId().equals(currentUser.getMunicipality().getId())) {
            throw new BusinessException("Bu ödülü silmeye yetkiniz yok.", "ACCESS_DENIED");
        }

        rewardRepository.delete(reward);
        log.info("Ödül silindi (soft delete): id={}", id);
    }

    @Transactional(readOnly = true)
    public List<RewardResponse> listForAdmin(AppUser currentUser) {
        if (currentUser.getMunicipality() == null) {
            throw new BusinessException("Bu işlem için bir belediyeye bağlı olmalısınız.", "MUNICIPALITY_REQUIRED");
        }
        return rewardRepository.findByMunicipalityIdOrderByPointCostAsc(currentUser.getMunicipality().getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RewardResponse> listForCitizen(String municipalityId) {
        return rewardRepository.findByMunicipalityIdAndActiveTrueOrderByPointCostAsc(municipalityId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public RedeemedRewardResponse redeem(RedeemRewardRequest request, AppUser currentUser) {
        requireCitizen(currentUser);
        MunicipalityReward reward = rewardRepository.findById(request.rewardId())
                .orElseThrow(() -> new ResourceNotFoundException("Ödül", "id", request.rewardId()));

        if (!reward.isActive()) {
            throw new BusinessException("Bu ödül şu anda aktif değil.", "REWARD_NOT_ACTIVE");
        }

        if (reward.getStock() <= 0) {
            throw new BusinessException("Bu ödülün stoğu tükenmiştir.", "REWARD_OUT_OF_STOCK");
        }

        AppUser user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", currentUser.getId()));

        com.burak.belediyeapp.entity.Municipality citizenMunicipality = user.getPreferredMunicipality() != null 
                ? user.getPreferredMunicipality() 
                : user.getMunicipality();

        if (citizenMunicipality == null || !reward.getMunicipality().getId().equals(citizenMunicipality.getId())) {
            throw new BusinessException("Sadece kayıtlı/tercih ettiğiniz belediyenin ödüllerini alabilirsiniz.", "MUNICIPALITY_MISMATCH");
        }

        if (user.getLoyaltyPoints() < reward.getPointCost()) {
            throw new BusinessException(
                    "Sadakat puanınız bu ödülü almaya yetersiz. Gerekli: " + reward.getPointCost() + ", Mevcut: " + user.getLoyaltyPoints(),
                    "INSUFFICIENT_POINTS"
            );
        }

        // Stoğu düşür
        reward.setStock(reward.getStock() - 1);
        rewardRepository.save(reward);

        // Kullanıcı puanını düşür
        citizenReputationService.deductLoyaltyPoints(user.getId(), reward.getPointCost());

        // Kod üret
        String code = generateRedemptionCode();

        UserRedeemedReward redeemed = UserRedeemedReward.builder()
                .user(user)
                .reward(reward)
                .redemptionCode(code)
                .status("REDEEMED")
                .build();

        UserRedeemedReward saved = redeemedRewardRepository.save(redeemed);
        log.info("Kullanıcı ödül aldı: userId={}, rewardId={}", user.getId(), reward.getId());

        return mapToRedeemedResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<RedeemedRewardResponse> listRedeemed(AppUser currentUser) {
        requireCitizen(currentUser);
        return redeemedRewardRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .map(this::mapToRedeemedResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<RedeemedRewardResponse> listClaimsForAdmin(AppUser currentUser, Pageable pageable) {
        if (currentUser.getMunicipality() == null) {
            throw new BusinessException("Bu işlem için bir belediyeye bağlı olmalısınız.", "MUNICIPALITY_REQUIRED");
        }
        return redeemedRewardRepository.findByRewardMunicipalityIdOrderByCreatedAtDesc(currentUser.getMunicipality().getId(), pageable)
                .map(this::mapToRedeemedResponse);
    }

    @Transactional
    public RedeemedRewardResponse updateClaimStatus(String claimId, String status, AppUser currentUser) {
        if (currentUser.getMunicipality() == null) {
            throw new BusinessException("Bu işlem için bir belediyeye bağlı olmalısınız.", "MUNICIPALITY_REQUIRED");
        }

        UserRedeemedReward claim = redeemedRewardRepository.findByIdAndRewardMunicipalityId(claimId, currentUser.getMunicipality().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Talep kaydı bulunamadı.", "id", claimId));

        String oldStatus = claim.getStatus();
        if ("CLAIMED".equals(oldStatus) || "CANCELLED".equals(oldStatus)) {
            throw new BusinessException("Tamamlanmış veya iptal edilmiş talepler güncellenemez.", "CLAIM_ALREADY_FINALIZED");
        }

        if ("CLAIMED".equals(status)) {
            claim.setStatus("CLAIMED");
        } else if ("CANCELLED".equals(status)) {
            claim.setStatus("CANCELLED");
            // Stoğu geri ekle
            MunicipalityReward reward = claim.getReward();
            reward.setStock(reward.getStock() + 1);
            rewardRepository.save(reward);

            // Puanı iade et
            citizenReputationService.refundLoyaltyPoints(claim.getUser().getId(), reward.getPointCost());
        } else {
            throw new BusinessException("Geçersiz durum değeri: " + status, "INVALID_CLAIM_STATUS");
        }

        UserRedeemedReward saved = redeemedRewardRepository.save(claim);
        log.info("Ödül talep durumu güncellendi: id={}, durum={}", claimId, status);
        return mapToRedeemedResponse(saved);
    }

    private String generateRedemptionCode() {
        String uuid = UUID.randomUUID().toString().replace("-", "").toUpperCase();
        return "KV-" + uuid.substring(0, 4) + "-" + uuid.substring(4, 8);
    }

    private static void requireCitizen(AppUser currentUser) {
        if (currentUser == null || !currentUser.hasRole("ROLE_CITIZEN")) {
            throw new BusinessException("Yalnızca vatandaş hesapları ödül kullanabilir.", "CITIZEN_REQUIRED");
        }
    }

    private RewardResponse mapToResponse(MunicipalityReward reward) {
        return new RewardResponse(
                reward.getId(),
                reward.getMunicipality().getId(),
                reward.getMunicipality().getDisplayName(),
                reward.getTitle(),
                reward.getDescription(),
                reward.getPointCost(),
                reward.getStock(),
                reward.getImageUrl(),
                reward.isActive()
        );
    }

    private RedeemedRewardResponse mapToRedeemedResponse(UserRedeemedReward redeemed) {
        return new RedeemedRewardResponse(
                redeemed.getId(),
                redeemed.getReward().getId(),
                redeemed.getReward().getTitle(),
                redeemed.getReward().getImageUrl(),
                redeemed.getRedemptionCode(),
                redeemed.getStatus(),
                redeemed.getCreatedAt(),
                redeemed.getUser().getEmail(),
                redeemed.getUser().getFullName(),
                redeemed.getUser().getPhoneNumber(),
                redeemed.getReward().getPointCost()
        );
    }
}
