package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.UserRedeemedReward;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface IUserRedeemedRewardRepository extends JpaRepository<UserRedeemedReward, String> {

    List<UserRedeemedReward> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<UserRedeemedReward> findByRedemptionCode(String redemptionCode);

    Page<UserRedeemedReward> findByRewardMunicipalityIdOrderByCreatedAtDesc(String municipalityId, Pageable pageable);

    Optional<UserRedeemedReward> findByIdAndRewardMunicipalityId(String id, String municipalityId);
}
