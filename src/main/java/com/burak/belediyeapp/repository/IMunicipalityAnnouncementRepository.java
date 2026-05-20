package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.MunicipalityAnnouncement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface IMunicipalityAnnouncementRepository extends JpaRepository<MunicipalityAnnouncement, String> {

    List<MunicipalityAnnouncement> findByMunicipalityIdAndActiveTrueOrderByStartsAtDesc(String municipalityId);

    List<MunicipalityAnnouncement> findByMunicipalityIdOrderByStartsAtDesc(String municipalityId);
}
