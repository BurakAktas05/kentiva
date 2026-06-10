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

    /**
     * Belediyeye ait özel kategori; yoksa global (municipality IS NULL) eşleşmeye düşer.
     * AI'nın "kategoriyi düzelt" yetkisi bu sorgu ile tenant kapsamı içine alınır.
     */
    @org.springframework.data.jpa.repository.Query("""
            SELECT c FROM ReportCategory c
            WHERE c.active = true
              AND LOWER(c.name) = LOWER(:name)
              AND (c.municipality IS NULL OR c.municipality.id = :municipalityId)
            ORDER BY CASE WHEN c.municipality.id = :municipalityId THEN 0 ELSE 1 END
            """)
    java.util.List<ReportCategory> findVisibleToMunicipalityByName(
            @org.springframework.data.repository.query.Param("name") String name,
            @org.springframework.data.repository.query.Param("municipalityId") String municipalityId);

    List<ReportCategory> findAllByActiveTrueAndMunicipalityIsNull();

    List<ReportCategory> findAllByActiveTrueAndMunicipality_Id(String municipalityId);

    List<ReportCategory> findAllByActiveTrueAndMunicipalityIsNullOrMunicipality_Id(String municipalityId);

    @org.springframework.data.jpa.repository.Query("""
            SELECT c FROM ReportCategory c
            WHERE c.active = true
              AND (c.municipality IS NULL OR c.municipality.id = :municipalityId)
              AND (:departmentId IS NULL OR c.department IS NULL OR c.department.id = :departmentId)
            ORDER BY CASE
                WHEN c.municipality IS NOT NULL AND c.municipality.id = :municipalityId THEN 0
                ELSE 1
            END, LOWER(c.name)
            """)
    List<ReportCategory> findActiveForCitizenScope(
            @org.springframework.data.repository.query.Param("municipalityId") String municipalityId,
            @org.springframework.data.repository.query.Param("departmentId") String departmentId);

    long countByDepartment_Municipality_Id(String municipalityId);

    long countByMunicipality_Id(String municipalityId);

    long countByMunicipalityIsNull();
}
