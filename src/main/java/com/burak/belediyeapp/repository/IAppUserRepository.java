package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IAppUserRepository extends JpaRepository<AppUser, String> {

    Optional<AppUser> findByEmail(String email);

    @Query("SELECT u FROM AppUser u LEFT JOIN FETCH u.municipality WHERE u.email = :email")
    Optional<AppUser> findByEmailWithMunicipality(@Param("email") String email);

    boolean existsByEmail(String email);

    org.springframework.data.domain.Page<AppUser> findByRoles_Name(String roleName, org.springframework.data.domain.Pageable pageable);
    
    org.springframework.data.domain.Page<AppUser> findByMunicipalityId(String municipalityId, org.springframework.data.domain.Pageable pageable);

    Optional<AppUser> findByIdAndMunicipalityId(String id, String municipalityId);
    
    org.springframework.data.domain.Page<AppUser> findByRoles_NameAndMunicipalityId(String roleName, String municipalityId, org.springframework.data.domain.Pageable pageable);

    long countByMunicipalityId(String municipalityId);

    /**
     * Tüm belediyeler için kullanıcı sayısını TEK SQL ile getirir (N+1 önleme).
     * Çıktı: Object[]{municipalityId, count}
     */
    @Query("""
            SELECT u.municipality.id, COUNT(u)
            FROM AppUser u
            WHERE u.municipality.id IS NOT NULL
            GROUP BY u.municipality.id
            """)
    java.util.List<Object[]> countAllGroupedByMunicipality();

    Optional<AppUser> findByPhoneNumber(String phoneNumber);

    long countByRoles_Name(String roleName);

    /** Belediyeyi tercih eden vatandaşlar (ana ekran widget'larında bu belediyeyi seçenler). */
    java.util.List<AppUser> findByPreferredMunicipalityId(String preferredMunicipalityId);
}
