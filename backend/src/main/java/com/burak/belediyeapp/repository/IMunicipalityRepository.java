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

    boolean existsByDistrictIdAndOnboardedTrue(Long districtId);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE turkey_districts SET boundaries = ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:geoJson), 4326)), 3)) WHERE id = (SELECT district_id FROM municipalities WHERE id = :id)", nativeQuery = true)
    void updateBoundariesFromGeoJson(@Param("id") String id, @Param("geoJson") String geoJson);

    @Query(value = """
            SELECT m.* FROM municipalities m
            JOIN turkey_districts td ON m.district_id = td.id
            WHERE m.active = true 
              AND td.boundaries IS NOT NULL
              AND ST_Contains(td.boundaries, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326))
            ORDER BY ST_Area(td.boundaries) ASC
            LIMIT 1
            """, nativeQuery = true)
    Optional<Municipality> findMunicipalityByCoordinate(@Param("latitude") double latitude, @Param("longitude") double longitude);

    @Query(value = """
            SELECT EXISTS(
                SELECT 1 FROM municipalities m
                JOIN turkey_districts td ON m.district_id = td.id
                WHERE m.id = :id
                  AND m.active = true
                  AND td.boundaries IS NOT NULL
                  AND ST_Contains(td.boundaries, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326))
            )
            """, nativeQuery = true)
    boolean isWithinBoundaries(@Param("id") String id, @Param("latitude") double latitude, @Param("longitude") double longitude);

    @Query("""
            SELECT m FROM Municipality m
            LEFT JOIN FETCH m.district d
            LEFT JOIN FETCH d.province
            """)
    List<Municipality> findAllWithDistrictAndProvince();

    @Query(value = """
            SELECT m.id as id, m.display_name as displayName, m.name as name, ST_AsGeoJSON(td.boundaries) as geoJson 
            FROM municipalities m 
            JOIN turkey_districts td ON m.district_id = td.id 
            WHERE m.onboarded = true AND td.boundaries IS NOT NULL
            """, nativeQuery = true)
    List<Object[]> findAllOnboardedBoundariesRaw();
}
