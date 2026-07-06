package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.AppUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IAppUserRepository extends JpaRepository<AppUser, String> {

    Optional<AppUser> findByEmail(String email);

    @Query("SELECT u FROM AppUser u LEFT JOIN FETCH u.municipality m LEFT JOIN FETCH m.district d LEFT JOIN FETCH d.province LEFT JOIN FETCH u.department LEFT JOIN FETCH u.preferredMunicipality WHERE u.email = :email")
    Optional<AppUser> findByEmailWithMunicipality(@Param("email") String email);

    boolean existsByEmail(String email);

    Page<AppUser> findByRoles_Name(String roleName, Pageable pageable);

    Page<AppUser> findByMunicipalityId(String municipalityId, Pageable pageable);

    Optional<AppUser> findByIdAndMunicipalityId(String id, String municipalityId);

    Page<AppUser> findByRoles_NameAndMunicipalityId(String roleName, String municipalityId, Pageable pageable);

    List<AppUser> findAllByRoles_NameAndMunicipalityId(String roleName, String municipalityId);

    long countByMunicipalityId(String municipalityId);

    @Query("""
            SELECT u.municipality.id, COUNT(u)
            FROM AppUser u
            WHERE u.municipality.id IS NOT NULL
            GROUP BY u.municipality.id
            """)
    List<Object[]> countAllGroupedByMunicipality();

    Optional<AppUser> findByPhoneNumber(String phoneNumber);

    long countByRoles_Name(String roleName);

    long countByPreferredMunicipalityId(String preferredMunicipalityId);

    List<AppUser> findByPreferredMunicipalityId(String preferredMunicipalityId);

    Page<AppUser> findByPreferredMunicipalityId(String preferredMunicipalityId, Pageable pageable);
}
