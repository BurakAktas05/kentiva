package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.ExportRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IExportRunRepository extends JpaRepository<ExportRun, String> {

    Page<ExportRun> findByMunicipalityIdOrderByCreatedAtDesc(String municipalityId, Pageable pageable);

    java.util.Optional<ExportRun> findByIdAndMunicipalityId(String id, String municipalityId);
}
