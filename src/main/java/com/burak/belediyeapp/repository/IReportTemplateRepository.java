package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.ReportTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IReportTemplateRepository extends JpaRepository<ReportTemplate, String> {

    @Query("""
            SELECT t FROM ReportTemplate t
            JOIN FETCH t.category
            WHERE t.active = true
              AND (t.municipality IS NULL OR t.municipality.id = :municipalityId)
            ORDER BY t.sortOrder ASC, t.title ASC
            """)
    List<ReportTemplate> findActiveForMunicipality(@Param("municipalityId") String municipalityId);

    @Query("""
            SELECT t FROM ReportTemplate t
            JOIN FETCH t.category
            WHERE t.municipality.id = :municipalityId
            ORDER BY t.sortOrder ASC, t.title ASC
            """)
    List<ReportTemplate> findByMunicipalityIdOrderBySortOrderAscTitleAsc(@Param("municipalityId") String municipalityId);

    @Query("""
            SELECT t FROM ReportTemplate t
            JOIN FETCH t.category
            WHERE t.municipality IS NULL
            ORDER BY t.sortOrder ASC, t.title ASC
            """)
    List<ReportTemplate> findAllGlobal();

    Optional<ReportTemplate> findByMunicipalityIsNullAndTemplateKey(String templateKey);

    Optional<ReportTemplate> findByMunicipalityIdAndTemplateKey(String municipalityId, String templateKey);

    boolean existsByMunicipalityIsNullAndTemplateKey(String templateKey);

    boolean existsByMunicipalityIdAndTemplateKey(String municipalityId, String templateKey);
}
