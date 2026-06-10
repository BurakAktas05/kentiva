package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.StarredStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IStarredStopRepository extends JpaRepository<StarredStop, String> {
    List<StarredStop> findAllByUserIdAndMunicipalityId(String userId, String municipalityId);
    Optional<StarredStop> findByUserIdAndStopNameAndMunicipalityId(String userId, String stopName, String municipalityId);
    boolean existsByUserIdAndStopNameAndMunicipalityId(String userId, String stopName, String municipalityId);
    List<StarredStop> findAllByStopNameAndMunicipalityId(String stopName, String municipalityId);
}
