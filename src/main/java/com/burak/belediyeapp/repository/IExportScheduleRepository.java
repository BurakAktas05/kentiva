package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.ExportSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IExportScheduleRepository extends JpaRepository<ExportSchedule, String> {

    List<ExportSchedule> findByMunicipalityIdOrderByCreatedAtDesc(String municipalityId);

    List<ExportSchedule> findByEnabledTrue();
}
