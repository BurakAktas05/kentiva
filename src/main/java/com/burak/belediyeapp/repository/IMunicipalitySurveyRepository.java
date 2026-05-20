package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.MunicipalitySurvey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IMunicipalitySurveyRepository extends JpaRepository<MunicipalitySurvey, String> {

    List<MunicipalitySurvey> findByMunicipalityIdAndActiveTrueOrderByCreatedAtDesc(String municipalityId);

    List<MunicipalitySurvey> findByMunicipalityIdOrderByCreatedAtDesc(String municipalityId);
}
