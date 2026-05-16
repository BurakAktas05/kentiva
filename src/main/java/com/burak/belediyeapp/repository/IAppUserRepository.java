package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IAppUserRepository extends JpaRepository<AppUser, String> {

    Optional<AppUser> findByEmail(String email);

    boolean existsByEmail(String email);

    java.util.List<AppUser> findByRoles_Name(String roleName);
    
    java.util.List<AppUser> findByMunicipalityId(String municipalityId);

    Optional<AppUser> findByIdAndMunicipalityId(String id, String municipalityId);
    
    java.util.List<AppUser> findByRoles_NameAndMunicipalityId(String roleName, String municipalityId);
    
    long countByMunicipalityId(String municipalityId);

    Optional<AppUser> findByPhoneNumber(String phoneNumber);
}
