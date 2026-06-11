package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.LostPetAd;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ILostPetAdRepository extends JpaRepository<LostPetAd, String> {

    @EntityGraph(attributePaths = "user")
    List<LostPetAd> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = "user")
    List<LostPetAd> findByLastSeenDistrictOrderByCreatedAtDesc(String district);
}
