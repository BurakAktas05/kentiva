package com.burak.belediyeapp.service.security;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportMedia;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * KVKK/GDPR uyumu — çözülmüş (RESOLVED) ve belirli süre geçmiş ihbarlara ait
 * kişisel verileri otomatik olarak anonimleştirir veya siler.
 *
 * Temizlenen veriler:
 * - Vatandaş adı/soyadı/telefonu/ilişkisi → "Anonim Vatandaş" (Ortak placeholder kullanıcı ile ilişkilendirilir)
 * - Orijinal (maskelenmemiş) fotoğraflar → silinir
 *
 * Her gün saat 03:00'da çalışır. {@code app.kvkk.cleanup.enabled=true} ile aktif edilir.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.kvkk.cleanup.enabled", havingValue = "true", matchIfMissing = false)
public class KvkkDataCleanupService {

    private final IReportRepository reportRepository;
    private final IAppUserRepository userRepository;
    private final StorageService storageService;

    /** Saklama süresi (gün). Varsayılan: 90 gün. */
    @Value("${app.kvkk.cleanup.retention-days:90}")
    private int retentionDays;

    /** Tek seferde işlenecek maksimum rapor sayısı. */
    @Value("${app.kvkk.cleanup.batch-size:100}")
    private int batchSize;

    /**
     * Her gün saat 03:00'da çalışır.
     * Çözülmüş (RESOLVED) ve saklama süresi dolmuş ihbarlardaki kişisel verileri temizler.
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void cleanupExpiredPersonalData() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        log.info("KVKK veri temizliği başlatıldı. Eşik tarihi: {}, saklama süresi: {} gün", cutoff, retentionDays);

        List<Report> expiredReports = reportRepository.findResolvedReportsOlderThan(
                cutoff, PageRequest.of(0, batchSize));

        if (expiredReports.isEmpty()) {
            log.info("KVKK veri temizliği: Temizlenecek ihbar bulunamadı.");
            return;
        }

        // Anonim kullanıcıyı bul veya oluştur
        AppUser anonymousUser = getOrCreateAnonymousUser();

        int cleanedCount = 0;
        int mediaDeletedCount = 0;

        for (Report report : expiredReports) {
            try {
                cleanedCount++;
                cleanReportPersonalData(report, anonymousUser);

                // Fotoğrafları sil
                if (report.getMediaList() != null && !report.getMediaList().isEmpty()) {
                    for (ReportMedia media : report.getMediaList()) {
                        try {
                            if (media.getImageUrl() != null && !media.getImageUrl().isBlank()) {
                                storageService.deleteFile(media.getImageUrl());
                                mediaDeletedCount++;
                            }
                        } catch (Exception e) {
                            log.warn("KVKK: Medya dosyası silinemedi: reportId={}, url={}, err={}",
                                    report.getId(), media.getImageUrl(), e.getMessage());
                        }
                    }
                    report.getMediaList().clear();
                }

                reportRepository.save(report);
            } catch (Exception e) {
                log.error("KVKK: Rapor temizliği başarısız: reportId={}, err={}", report.getId(), e.getMessage());
            }
        }

        log.info("KVKK veri temizliği tamamlandı. Temizlenen ihbar: {}, silinen medya: {}", cleanedCount, mediaDeletedCount);
    }

    /**
     * Rapordaki kişisel verileri anonim hale getirir.
     */
    @Transactional
    protected void cleanReportPersonalData(Report report, AppUser anonymousUser) {
        // Vatandaş ilişkisini Anonim Vatandaş kullanıcısına yönlendir
        if (report.getReporter() != null) {
            report.setReporter(anonymousUser);
        }

        // Açıklama ve başlıktaki potansiyel PII'yi koruyabiliriz (istatistik amaçlı)
        // ancak FCM token ve AI draft gibi veriler temizlenir.
        report.setFcmToken(null);
        report.setAiReplyDraft(null);
        report.setAiDuplicateHint(null);
    }

    private AppUser getOrCreateAnonymousUser() {
        return userRepository.findByEmail("anonymous@kentiva.local")
                .orElseGet(() -> {
                    log.info("Sistem genelinde 'Anonim Vatandaş' kullanıcısı oluşturuluyor...");
                    AppUser anonymous = new AppUser();
                    anonymous.setEmail("anonymous@kentiva.local");
                    // Şifre alanı boş geçilemez, dummy bcrypt hash'i atıyoruz
                    anonymous.setPassword("$2a$10$7R9rR.k28Rz4W3/n5/N8v.kP5JjW14sLq.6tZ/7kO2k1bK7rD7Cze");
                    anonymous.setFirstName("Anonim");
                    anonymous.setLastName("Vatandaş");
                    anonymous.setPhoneNumber(null);
                    anonymous.setEnabled(false); // Bu kullanıcı doğrudan login olamaz
                    anonymous.setReputationScore(100);
                    anonymous.setLoyaltyPoints(100);
                    anonymous.setKvkkApproved(true);
                    anonymous.setKvkkApprovedAt(LocalDateTime.now());
                    return userRepository.save(anonymous);
                });
    }
}
