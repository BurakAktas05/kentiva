package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.TurkeyDistrict;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ITurkeyDistrictRepository extends JpaRepository<TurkeyDistrict, Long> {
    Optional<TurkeyDistrict> findByMemberId(String memberId);
    List<TurkeyDistrict> findByProvincePlateCodeOrderByNameTrAsc(String plateCode);
    Optional<TurkeyDistrict> findByProvincePlateCodeAndDistrictSlug(String plateCode, String districtSlug);

    @Query("SELECT d FROM TurkeyDistrict d JOIN FETCH d.province WHERE d.id = :id")
    Optional<TurkeyDistrict> findByIdWithProvince(@Param("id") Long id);

    @Query("SELECT d FROM TurkeyDistrict d JOIN FETCH d.province WHERE d.memberId = :memberId")
    Optional<TurkeyDistrict> findByMemberIdWithProvince(@Param("memberId") String memberId);

    @Query("""
        SELECT new com.burak.belediyeapp.dto.response.publicapi.PublicDistrictDto(
            d.id,
            d.memberId,
            d.province.plateCode,
            d.districtSlug,
            d.nameTr,
            CASE WHEN m.id IS NOT NULL THEN true ELSE false END,
            m.id
        )
        FROM TurkeyDistrict d
        LEFT JOIN Municipality m ON m.district.id = d.id AND m.onboarded = true AND m.active = true
        WHERE d.province.plateCode = :plateCode
        ORDER BY d.nameTr ASC
    """)
    List<com.burak.belediyeapp.dto.response.publicapi.PublicDistrictDto> findPublicDistrictsByProvince(@Param("plateCode") String plateCode);

    @Query("""
        SELECT new com.burak.belediyeapp.dto.response.municipality.AdminDistrictCatalogDto(
            d.id,
            d.memberId,
            d.province.plateCode,
            d.districtSlug,
            d.nameTr,
            CASE WHEN m.id IS NOT NULL THEN true ELSE false END,
            m.id,
            d.boundaryStatus,
            d.osmId
        )
        FROM TurkeyDistrict d
        LEFT JOIN Municipality m ON m.district.id = d.id AND m.onboarded = true AND m.active = true
        ORDER BY d.province.plateCode ASC, d.nameTr ASC
    """)
    List<com.burak.belediyeapp.dto.response.municipality.AdminDistrictCatalogDto> findAllAdminCatalog();

    @Query("""
        SELECT new com.burak.belediyeapp.dto.response.municipality.AdminDistrictCatalogDto(
            d.id,
            d.memberId,
            d.province.plateCode,
            d.districtSlug,
            d.nameTr,
            CASE WHEN m.id IS NOT NULL THEN true ELSE false END,
            m.id,
            d.boundaryStatus,
            d.osmId
        )
        FROM TurkeyDistrict d
        LEFT JOIN Municipality m ON m.district.id = d.id AND m.onboarded = true AND m.active = true
        WHERE d.province.plateCode = :plateCode
        ORDER BY d.nameTr ASC
    """)
    List<com.burak.belediyeapp.dto.response.municipality.AdminDistrictCatalogDto> findAdminCatalogByProvince(@Param("plateCode") String plateCode);

    @Query(value = "SELECT ST_AsGeoJSON(boundaries) FROM turkey_districts WHERE id = :id", nativeQuery = true)
    Optional<String> findBoundaryGeoJsonById(@Param("id") Long id);

    @Query(value = "SELECT ST_AsGeoJSON(td.boundaries) FROM municipalities m JOIN turkey_districts td ON m.district_id = td.id WHERE m.id = :municipalityId", nativeQuery = true)
    Optional<String> findBoundaryGeoJsonByMunicipalityId(@Param("municipalityId") String municipalityId);
}
