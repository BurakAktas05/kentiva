package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.ReportHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IReportHistoryRepository extends JpaRepository<ReportHistory, String> {

    @Query("""
            SELECT h FROM ReportHistory h
            LEFT JOIN FETCH h.changedBy
            WHERE h.report.id = :reportId
            ORDER BY h.createdAt ASC
            """)
    List<ReportHistory> findTimelineByReportId(@Param("reportId") String reportId);

    java.util.Optional<ReportHistory> findFirstByReport_IdOrderByCreatedAtDesc(String reportId);
}
