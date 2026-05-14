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

    List<Department> findByMunicipalityId(String municipalityId);

    Optional<Department> findByIdAndMunicipalityId(String id, String municipalityId);
    
    List<Department> findAllByActiveTrueAndMunicipalityId(String municipalityId);
    
    long countByMunicipalityId(String municipalityId);
}
