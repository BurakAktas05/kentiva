package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.MediaAnonymizationFailure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * KVKK anonimleştirme hatalarının Dead Letter Queue repository'si.
 */
@Repository
public interface IMediaAnonymizationFailureRepository extends JpaRepository<MediaAnonymizationFailure, String> {

    /**
     * Çözülmemiş ve maksimum deneme sayısına ulaşmamış başarısız işlemleri getirir.
     * Periyodik retry job'ı tarafından kullanılır.
     */
    List<MediaAnonymizationFailure> findByResolvedFalseAndMaxRetriesExceededFalseOrderByCreatedAtAsc();

    /**
     * Belirli bir rapor için çözülmemiş hata var mı kontrol eder.
     */
    boolean existsByReportIdAndResolvedFalse(String reportId);

    /**
     * Tüm çözülmemiş hata sayısını döner (dashboard metriği için).
     */
    long countByResolvedFalse();
}
