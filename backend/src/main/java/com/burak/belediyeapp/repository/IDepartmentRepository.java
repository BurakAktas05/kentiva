package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IDepartmentRepository extends JpaRepository<Department, String> {

    Optional<Department> findByName(String name);

    List<Department> findAllByActiveTrue();

    boolean existsByName(String name);

    boolean existsByNameAndMunicipalityId(String name, String municipalityId);

    boolean existsBySlugIgnoreCaseAndMunicipalityId(String slug, String municipalityId);

    org.springframework.data.domain.Page<Department> findByMunicipalityId(String municipalityId, org.springframework.data.domain.Pageable pageable);

    List<Department> findAllByActiveTrueAndMunicipalityIdOrderByNameAsc(String municipalityId);

    Optional<Department> findByIdAndMunicipalityId(String id, String municipalityId);

    Optional<Department> findByMunicipalityIdAndSlugIgnoreCase(String municipalityId, String slug);

    long countByMunicipalityId(String municipalityId);
}
