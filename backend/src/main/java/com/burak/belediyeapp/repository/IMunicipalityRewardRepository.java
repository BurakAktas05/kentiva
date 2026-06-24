package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.MunicipalityReward;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface IMunicipalityRewardRepository extends JpaRepository<MunicipalityReward, String> {

    List<MunicipalityReward> findByMunicipalityIdAndActiveTrueOrderByPointCostAsc(String municipalityId);

    List<MunicipalityReward> findByMunicipalityIdOrderByPointCostAsc(String municipalityId);

    Optional<MunicipalityReward> findByIdAndMunicipalityId(String id, String municipalityId);
}
