package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IReportRepository extends JpaRepository<Report, String>, JpaSpecificationExecutor<Report> {

    /**
     * Vatandaşın kendi raporlarını sayfalanmış olarak getirir.
     * EntityGraph: kategori LAZY N+1 olmasın diye eagerly fetch.
     */
    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByReporterId(String reporterId, Pageable pageable);

    Optional<Report> findByIdAndMunicipalityId(String id, String municipalityId);

    @EntityGraph(attributePaths = {"category", "reporter", "assignee"})
    Optional<Report> findByTrackingNumber(String trackingNumber);

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
     * KVKK/GDPR veri temizliği — çözülmüş ve saklama süresi dolmuş ihbarları bulur.
     * @param cutoff Bu tarihten önce güncellenen RESOLVED ihbarlar döner.
     */
    @Query("""
            SELECT r FROM Report r
            LEFT JOIN FETCH r.reporter
            LEFT JOIN FETCH r.mediaList
            WHERE r.reportStatus = com.burak.belediyeapp.entity.ReportStatus.RESOLVED
              AND r.updatedAt < :cutoff
              AND r.deleted = false
            ORDER BY r.updatedAt ASC
            """)
    List<Report> findResolvedReportsOlderThan(
            @Param("cutoff") java.time.LocalDateTime cutoff,
            org.springframework.data.domain.Pageable pageable);


    /**
     * Belirli bir saha görevlisine atanmış raporları getirir.
     */
    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByAssigneeIdAndHiddenFromMunicipalityFalse(String assigneeId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByAssigneeIdAndMunicipalityIdAndHiddenFromMunicipalityFalse(String assigneeId, String municipalityId, Pageable pageable);

    /**
     * Duruma göre filtreli rapor listesi (admin paneli için).
     */
    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByReportStatusAndHiddenFromMunicipalityFalse(ReportStatus status, Pageable pageable);

    /**
     * Departmana göre raporları getirir (birim müdürü görünümü).
     */
    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByCategoryDepartmentIdAndHiddenFromMunicipalityFalse(String departmentId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByCategoryDepartmentIdAndMunicipalityIdAndHiddenFromMunicipalityFalse(String departmentId, String municipalityId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByCategoryDepartmentIdAndMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(String departmentId, String municipalityId, ReportStatus reportStatus, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByCategoryDepartmentIdAndReportStatusAndHiddenFromMunicipalityFalse(String departmentId, ReportStatus status, Pageable pageable);

    /**
     * Yönlendirilmiş raporlar (Birim Müdürü DEPARTMENTAL mod)
     */
    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByForwardedDepartmentIdAndHiddenFromMunicipalityFalse(String departmentId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByForwardedDepartmentIdAndMunicipalityIdAndHiddenFromMunicipalityFalse(String departmentId, String municipalityId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByForwardedDepartmentIdAndReportStatusAndHiddenFromMunicipalityFalse(String departmentId, ReportStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByForwardedDepartmentIdAndMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(String departmentId, String municipalityId, ReportStatus status, Pageable pageable);


    /**
     * PostGIS ile belirtilen koordinat merkezine belirli bir yarıçap (metre)
     * içindeki raporları getirir. Saha ekibinin yakındaki sorunları görmesi için.
     *
     * ST_DWithin fonksiyonu coğrafi (metre cinsinden) mesafe kontrolü yapar.
     */
    @Query(value = """
            SELECT r.* FROM reports r
            WHERE r.hidden_from_municipality = false
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
    List<Report> findNearbyReports(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusInMeters") double radiusInMeters
    );

    @Query(value = """
            SELECT r.* FROM reports r
            WHERE r.municipality_id = :municipalityId
              AND r.hidden_from_municipality = false
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
              AND r.hidden_from_municipality = false
              AND r.report_status IN ('PENDING', 'PROCESSING')
              AND (:categoryId IS NULL OR r.category_id = :categoryId)
              AND ST_DWithin(
                r.location::geography,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                :radiusInMeters
            )
            ORDER BY r.created_at ASC
            LIMIT :maxRows
            """, nativeQuery = true)
    List<Report> findActiveNearbyInMunicipality(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusInMeters") double radiusInMeters,
            @Param("municipalityId") String municipalityId,
            @Param("excludeId") String excludeId,
            @Param("categoryId") String categoryId,
            @Param("maxRows") int maxRows
    );

    @Query(value = """
            SELECT r.* FROM reports r
            WHERE r.municipality_id = :municipalityId
              AND r.id <> :excludeId
              AND r.hidden_from_municipality = false
              AND r.report_status IN ('PENDING', 'PROCESSING')
              AND (:categoryId IS NULL OR r.category_id = :categoryId)
              AND ST_DWithin(
                 r.location::geography,
                 ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                 :radiusInMeters
              )
              AND r.title_description_vector IS NOT NULL
              AND (r.title_description_vector <=> cast(:embedding as vector)) < :maxDistance
            ORDER BY (r.title_description_vector <=> cast(:embedding as vector)) ASC
            LIMIT :maxRows
            """, nativeQuery = true)
    List<Report> findSemanticNearbyInMunicipality(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusInMeters") double radiusInMeters,
            @Param("municipalityId") String municipalityId,
            @Param("excludeId") String excludeId,
            @Param("categoryId") String categoryId,
            @Param("embedding") String embeddingString,
            @Param("maxDistance") double maxDistance,
            @Param("maxRows") int maxRows
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query(value = "UPDATE reports SET title_description_vector = cast(:embedding as vector) WHERE id = :id", nativeQuery = true)
    void updateReportEmbedding(@Param("id") String id, @Param("embedding") String embeddingString);

    int countByDuplicateGroupId(String duplicateGroupId);

    /**
     * Bir sayfa rapor için duplicate grup büyüklüklerini TEK sorguda toplar (N+1 çözümü).
     * Çıktı: Object[]{groupId, count}
     */
    @Query("""
            SELECT r.duplicateGroupId, COUNT(r)
            FROM Report r
            WHERE r.duplicateGroupId IN :groupIds
            GROUP BY r.duplicateGroupId
            """)
    List<Object[]> countDuplicateGroupsForIds(@Param("groupIds") java.util.Collection<String> groupIds);

    @EntityGraph(attributePaths = {"category"})
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

    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByMunicipalityIdAndHiddenFromMunicipalityFalse(String municipalityId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Report> findByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(String municipalityId, ReportStatus status, Pageable pageable);
    
    long countByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalse(String municipalityId, ReportStatus status);

    long countByMunicipalityIdAndHiddenFromMunicipalityFalse(String municipalityId);

    long countByMunicipalityIdAndHiddenFromMunicipalityFalseAndCreatedAtAfter(String municipalityId, LocalDateTime createdAt);

    long countByMunicipalityIdAndReportStatusAndHiddenFromMunicipalityFalseAndCreatedAtAfter(
            String municipalityId, ReportStatus status, LocalDateTime createdAt);

    @Query("""
            SELECT COUNT(DISTINCT r.reporter.id)
            FROM Report r
            WHERE r.municipality.id = :municipalityId
              AND r.hiddenFromMunicipality = false
            """)
    long countDistinctReportersByMunicipalityId(@Param("municipalityId") String municipalityId);

    @Query(value = """
            SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(r.updated_at, r.created_at) - r.created_at)) / 3600.0)
            FROM reports r
            WHERE r.municipality_id = :municipalityId
              AND r.hidden_from_municipality = false
              AND r.report_status = 'RESOLVED'
            """, nativeQuery = true)
    Double averageResolutionHoursByMunicipality(@Param("municipalityId") String municipalityId);

    @Query(value = """
            SELECT COALESCE(c.name, 'Diger') AS label, COUNT(*) AS total
            FROM reports r
            LEFT JOIN report_categories c ON c.id = r.category_id
            WHERE r.municipality_id = :municipalityId
              AND r.hidden_from_municipality = false
            GROUP BY COALESCE(c.name, 'Diger')
            ORDER BY total DESC
            LIMIT 5
            """, nativeQuery = true)
    List<Object[]> findPilotTopCategories(@Param("municipalityId") String municipalityId);

    @Query(value = """
            SELECT COALESCE(NULLIF(r.district, ''), 'Genel') AS label, COUNT(*) AS total
            FROM reports r
            WHERE r.municipality_id = :municipalityId
              AND r.hidden_from_municipality = false
            GROUP BY COALESCE(NULLIF(r.district, ''), 'Genel')
            ORDER BY total DESC
            LIMIT 5
            """, nativeQuery = true)
    List<Object[]> findPilotTopDistricts(@Param("municipalityId") String municipalityId);

    @Query(value = """
            SELECT
                COALESCE(d.name, 'Atanmamis') AS department_name,
                COUNT(*) AS total_reports,
                COUNT(*) FILTER (WHERE r.report_status = 'RESOLVED') AS resolved_reports,
                COUNT(*) FILTER (WHERE r.report_status IN ('PENDING', 'PROCESSING', 'FORWARDED')) AS open_reports
            FROM reports r
            LEFT JOIN report_categories c ON c.id = r.category_id
            LEFT JOIN departments d ON d.id = COALESCE(r.forwarded_department_id, c.department_id)
            WHERE r.municipality_id = :municipalityId
              AND r.hidden_from_municipality = false
            GROUP BY COALESCE(d.name, 'Atanmamis')
            ORDER BY total_reports DESC
            LIMIT 8
            """, nativeQuery = true)
    List<Object[]> findPilotDepartmentPerformance(@Param("municipalityId") String municipalityId);

    long countByReporterIdAndReportStatus(String reporterId, ReportStatus status);

    long countByReporterIdAndReportStatusAndCreatedAtAfter(String reporterId, ReportStatus status, LocalDateTime since);

    @Query("SELECT COUNT(r) FROM Report r WHERE r.reporter.id = :reporterId AND r.reportStatus = com.burak.belediyeapp.entity.ReportStatus.REJECTED AND r.hiddenFromMunicipality = true AND r.createdAt >= :since")
    long countAutoRejectedReports(@Param("reporterId") String reporterId, @Param("since") LocalDateTime since);

    /**
     * Tüm belediyeler için rapor sayısını TEK SQL ile getirir (dashboard N+1 önleme).
     * Çıktı: Object[]{municipalityId, count}
     */
    @Query("""
            SELECT r.municipality.id, COUNT(r)
            FROM Report r
            WHERE r.municipality.id IS NOT NULL
            GROUP BY r.municipality.id
            """)
    List<Object[]> countAllGroupedByMunicipality();

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

    @Query("""
            SELECT r FROM Report r
            LEFT JOIN FETCH r.category
            WHERE r.municipality.slug = :municipalitySlug
              AND r.reportStatus = com.burak.belediyeapp.entity.ReportStatus.RESOLVED
            ORDER BY r.updatedAt DESC
            """)
    List<Report> findRecentResolvedReportsByMunicipalitySlug(
            @Param("municipalitySlug") String municipalitySlug,
            org.springframework.data.domain.Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"category"})
    Page<Report> findAll(Pageable pageable);

    boolean existsByTrackingNumber(String trackingNumber);

    @Query("SELECT r FROM Report r LEFT JOIN FETCH r.municipality WHERE r.reportStatus IN :statuses AND r.slaBreached = false")
    java.util.List<Report> findUnresolvedReportsNotSlaBreached(@Param("statuses") java.util.Collection<ReportStatus> statuses);
}
