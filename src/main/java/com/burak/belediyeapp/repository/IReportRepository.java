package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IReportRepository extends JpaRepository<Report, String> {

    /**
     * Vatandaşın kendi raporlarını sayfalanmış olarak getirir.
     */
    Page<Report> findByReporterId(String reporterId, Pageable pageable);

    Optional<Report> findByIdAndMunicipalityId(String id, String municipalityId);

    /**
     * Belirli bir saha görevlisine atanmış raporları getirir.
     */
    Page<Report> findByAssigneeId(String assigneeId, Pageable pageable);

    Page<Report> findByAssigneeIdAndMunicipalityId(String assigneeId, String municipalityId, Pageable pageable);

    /**
     * Duruma göre filtreli rapor listesi (admin paneli için).
     */
    Page<Report> findByReportStatus(ReportStatus status, Pageable pageable);

    /**
     * Departmana göre raporları getirir (birim müdürü görünümü).
     */
    Page<Report> findByCategoryDepartmentId(String departmentId, Pageable pageable);

    Page<Report> findByCategoryDepartmentIdAndMunicipalityId(String departmentId, String municipalityId, Pageable pageable);

    /**
     * PostGIS ile belirtilen koordinat merkezine belirli bir yarıçap (metre)
     * içindeki raporları getirir. Saha ekibinin yakındaki sorunları görmesi için.
     *
     * ST_DWithin fonksiyonu coğrafi (metre cinsinden) mesafe kontrolü yapar.
     */
    @Query(value = """
            SELECT r.* FROM reports r
            WHERE ST_DWithin(
                r.location::geography,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                :radiusInMeters
            )
            ORDER BY ST_Distance(
                r.location::geography,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
            )
            """, nativeQuery = true)
    List<Report> findNearbyReports(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusInMeters") double radiusInMeters
    );

    @Query(value = """
            SELECT r.* FROM reports r
            WHERE r.municipality_id = :municipalityId
              AND ST_DWithin(
                r.location::geography,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                :radiusInMeters
            )
            ORDER BY ST_Distance(
                r.location::geography,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
            )
            """, nativeQuery = true)
    List<Report> findNearbyReportsByMunicipality(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusInMeters") double radiusInMeters,
            @Param("municipalityId") String municipalityId
    );

    /**
     * İlçeye göre raporları getirir.
     */
    Page<Report> findByDistrict(String district, Pageable pageable);

    /**
     * İlçe ve duruma göre raporları getirir.
     */
    Page<Report> findByDistrictAndReportStatus(String district, ReportStatus status, Pageable pageable);

    /**
     * Kategori bazlı istatistik — yönetim dashboard'u için.
     */
    long countByReportStatus(ReportStatus status);

    /**
     * İlçe bazlı durum istatistiği.
     */
    long countByDistrictAndReportStatus(String district, ReportStatus status);

    Page<Report> findByMunicipalityId(String municipalityId, Pageable pageable);
    
    Page<Report> findByMunicipalityIdAndReportStatus(String municipalityId, ReportStatus status, Pageable pageable);
    
    long countByMunicipalityIdAndReportStatus(String municipalityId, ReportStatus status);
}
