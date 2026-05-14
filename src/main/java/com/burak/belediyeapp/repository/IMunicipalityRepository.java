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
            WHERE m.active = true AND m.type = :type
            ORDER BY COALESCE(NULLIF(TRIM(m.displayName), ''), m.name)
            """)
    List<Municipality> findActiveByTypeOrderByDisplay(@Param("type") MunicipalityType type);
}
