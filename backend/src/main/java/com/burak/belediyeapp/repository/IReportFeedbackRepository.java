package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.ReportFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface IReportFeedbackRepository extends JpaRepository<ReportFeedback, String> {

    boolean existsByReportId(String reportId);

    @Query("SELECT AVG(f.rating) FROM ReportFeedback f WHERE f.report.municipality.id = :municipalityId")
    Double getAverageRatingForMunicipality(@Param("municipalityId") String municipalityId);

    @Query("SELECT AVG(f.rating) FROM ReportFeedback f")
    Double getGlobalAverageRating();
}
