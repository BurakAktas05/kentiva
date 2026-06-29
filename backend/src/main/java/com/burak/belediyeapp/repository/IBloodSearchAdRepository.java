package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.BloodSearchAd;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface IBloodSearchAdRepository extends JpaRepository<BloodSearchAd, String> {

    @EntityGraph(attributePaths = "user")
    List<BloodSearchAd> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = "user")
    List<BloodSearchAd> findByHospitalDistrictOrderByCreatedAtDesc(String district);

    @Modifying
    @Query("delete from BloodSearchAd ad where ad.user.id = :userId")
    void hardDeleteAllByUserId(String userId);
}
