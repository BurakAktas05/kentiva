package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.MunicipalityEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface IMunicipalityEventRepository extends JpaRepository<MunicipalityEvent, String> {

    List<MunicipalityEvent> findByMunicipalityIdAndActiveTrueAndStartsAtAfterOrderByStartsAtAsc(
            String municipalityId, LocalDateTime after);

    List<MunicipalityEvent> findByMunicipalityIdOrderByStartsAtDesc(String municipalityId);
}
