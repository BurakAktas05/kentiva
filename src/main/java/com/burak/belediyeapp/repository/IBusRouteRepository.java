package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.BusRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IBusRouteRepository extends JpaRepository<BusRoute, String> {
    List<BusRoute> findAllByMunicipalityIdAndActiveTrue(String municipalityId);
    List<BusRoute> findAllByMunicipalityId(String municipalityId);
    void deleteAllByMunicipalityId(String municipalityId);
}
