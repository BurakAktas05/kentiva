package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IReportRepository extends JpaRepository<Report, String> {

    /**
     * Vatandaşın kendi raporlarını sayfalanmış olarak getirir.
     */
    Page<Report> findByReporterId(String reporterId, Pageable pageable);

    Optional<Report> findByIdAndMunicipalityId(String id, String municipalityId);

    @Query("SELECT r FROM Report r LEFT JOIN FETCH r.municipality WHERE r.id = :id")
    Optional<Report> findByIdWithMunicipality(@Param("id") String id);

    @Query("""
            SELECT r FROM Report r
            LEFT JOIN FETCH r.municipality
            LEFT JOIN FETCH r.category
            LEFT JOIN FETCH r.reporter
            WHERE r.id = :id
            """)
    Optional<Report> findByIdForRealtimePush(@Param("id") String id);

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

    @Query(value = """
            SELECT r.* FROM reports r
            WHERE r.municipality_id = :municipalityId
              AND r.id <> :excludeId
              AND r.report_status IN ('PENDING', 'PROCESSING')
              AND ST_DWithin(
                r.location::geography,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                :radiusInMeters
            )
            ORDER BY r.created_at ASC
            """, nativeQuery = true)
    List<Report> findActiveNearbyInMunicipality(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusInMeters") double radiusInMeters,
            @Param("municipalityId") String municipalityId,
            @Param("excludeId") String excludeId
    );

    int countByDuplicateGroupId(String duplicateGroupId);

    List<Report> findByDuplicateGroupIdAndIdNot(String duplicateGroupId, String excludeId);

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

    long countByMunicipalityId(String municipalityId);

    @Query("""
            SELECT r FROM Report r
            LEFT JOIN FETCH r.category
            LEFT JOIN FETCH r.reporter
            LEFT JOIN FETCH r.assignee
            WHERE (:municipalityId IS NULL OR r.municipality.id = :municipalityId)
              AND (:status IS NULL OR r.reportStatus = :status)
              AND (:from IS NULL OR r.createdAt >= :from)
              AND (:to IS NULL OR r.createdAt <= :to)
            ORDER BY r.createdAt DESC
            """)
    List<Report> findForExport(
            @Param("municipalityId") String municipalityId,
            @Param("status") ReportStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);

    @Query("""
            SELECT r FROM Report r
            LEFT JOIN FETCH r.category
            LEFT JOIN FETCH r.reporter
            LEFT JOIN FETCH r.assignee
            WHERE r.id IN :reportIds
              AND (:municipalityId IS NULL OR r.municipality.id = :municipalityId)
            ORDER BY r.createdAt DESC
            """)
    List<Report> findForExportByIds(
            @Param("reportIds") List<String> reportIds,
            @Param("municipalityId") String municipalityId);

    @Query(value = """
            SELECT
                COALESCE(c.name, 'Diğer') AS category_name,
                COALESCE(r.district, 'Genel') AS district,
                COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days') AS recent_cnt,
                COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '60 days'
                    AND r.created_at < NOW() - INTERVAL '30 days') AS prev_cnt,
                COUNT(*) FILTER (WHERE r.report_status IN ('PENDING', 'PROCESSING')) AS open_cnt
            FROM reports r
            LEFT JOIN report_categories c ON c.id = r.category_id
            WHERE r.municipality_id = :municipalityId
            GROUP BY c.name, r.district
            HAVING COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days') >= 2
            ORDER BY recent_cnt DESC
            LIMIT 15
            """, nativeQuery = true)
    List<Object[]> findPredictiveHotspots(@Param("municipalityId") String municipalityId);
}
