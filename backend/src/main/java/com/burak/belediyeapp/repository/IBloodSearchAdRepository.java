package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.BloodSearchAd;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IBloodSearchAdRepository extends JpaRepository<BloodSearchAd, String> {

    List<BloodSearchAd> findAllByOrderByCreatedAtDesc();

    List<BloodSearchAd> findByHospitalDistrictOrderByCreatedAtDesc(String district);
}
