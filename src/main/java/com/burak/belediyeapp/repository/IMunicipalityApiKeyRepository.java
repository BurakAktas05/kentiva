package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.MunicipalityApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface IMunicipalityApiKeyRepository extends JpaRepository<MunicipalityApiKey, String> {

    List<MunicipalityApiKey> findByMunicipalityIdOrderByCreatedAtDesc(String municipalityId);

    Optional<MunicipalityApiKey> findByIdAndMunicipalityId(String id, String municipalityId);

    @Query("SELECT k FROM MunicipalityApiKey k JOIN FETCH k.municipality WHERE k.keyPrefix = :prefix AND k.active = true")
    List<MunicipalityApiKey> findActiveByKeyPrefix(@Param("prefix") String prefix);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE MunicipalityApiKey k SET k.lastUsedAt = :usedAt WHERE k.id = :id")
    @org.springframework.transaction.annotation.Transactional
    void touchLastUsed(@Param("id") String id, @Param("usedAt") LocalDateTime usedAt);
}
