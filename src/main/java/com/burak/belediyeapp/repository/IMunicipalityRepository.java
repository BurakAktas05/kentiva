package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IMunicipalityRepository extends JpaRepository<Municipality, String> {

    Optional<Municipality> findBySlugIgnoreCaseAndActiveTrue(String slug);

    boolean existsBySlugIgnoreCase(String slug);

    @Query("""
            SELECT m FROM Municipality m
            LEFT JOIN FETCH m.parentMunicipality
            WHERE m.active = true
              AND m.onboarded = true
              AND m.type = :type
            """)
    List<Municipality> findOnboardedActiveByTypeWithParent(@Param("type") MunicipalityType type);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE municipalities SET boundaries = ST_SetSRID(ST_GeomFromGeoJSON(:geoJson), 4326) WHERE id = :id", nativeQuery = true)
    void updateBoundariesFromGeoJson(@Param("id") String id, @Param("geoJson") String geoJson);

    @Query(value = """
            SELECT m.* FROM municipalities m
            WHERE m.active = true 
              AND m.boundaries IS NOT NULL
              AND ST_Contains(m.boundaries, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326))
            LIMIT 1
            """, nativeQuery = true)
    Optional<Municipality> findMunicipalityByCoordinate(@Param("latitude") double latitude, @Param("longitude") double longitude);
}
