package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.ReportCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IReportCategoryRepository extends JpaRepository<ReportCategory, String> {

    List<ReportCategory> findAllByActiveTrue();

    boolean existsByName(String name);

    boolean existsByMunicipalityIdAndName(String municipalityId, String name);

    boolean existsByNameAndMunicipalityIsNull(String name);

    Optional<ReportCategory> findByName(String name);

    List<ReportCategory> findAllByActiveTrueAndMunicipalityIsNull();

    List<ReportCategory> findAllByActiveTrueAndMunicipality_Id(String municipalityId);

    List<ReportCategory> findAllByActiveTrueAndMunicipalityIsNullOrMunicipality_Id(String municipalityId);

    long countByDepartment_Municipality_Id(String municipalityId);

    long countByMunicipality_Id(String municipalityId);

    long countByMunicipalityIsNull();
}
