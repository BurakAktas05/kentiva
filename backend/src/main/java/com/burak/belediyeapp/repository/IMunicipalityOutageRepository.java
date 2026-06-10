package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.MunicipalityOutage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IMunicipalityOutageRepository extends JpaRepository<MunicipalityOutage, String> {

    List<MunicipalityOutage> findByMunicipalityIdAndActiveTrueOrderByStartsAtDesc(String municipalityId);

    List<MunicipalityOutage> findByMunicipalityIdOrderByStartsAtDesc(String municipalityId);
}
