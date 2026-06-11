package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.BloodSearchAd;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IBloodSearchAdRepository extends JpaRepository<BloodSearchAd, String> {

    @EntityGraph(attributePaths = "user")
    List<BloodSearchAd> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = "user")
    List<BloodSearchAd> findByHospitalDistrictOrderByCreatedAtDesc(String district);
}
