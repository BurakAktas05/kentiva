package com.burak.belediyeapp.service.citizen;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.entity.ReputationAuditLog;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.repository.IReputationAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;

/**
 * Vatandaş güven puanı — gerçek veritabanı skoru (0–1000 arası önerilen).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CitizenReputationService {

    public static final int DEFAULT_SCORE = 100;
    public static final int MIN_SCORE = 0;
    public static final int MAX_SCORE = 1000;

    public static final int DELTA_REPORT_CREATED = 25;
    public static final int DELTA_REPORT_RESOLVED = 50;
    public static final int DELTA_REPORT_REJECTED = -45;
    public static final int DELTA_SELFIE_REJECTED = -70;

    private final IAppUserRepository userRepository;
    private final IReportRepository reportRepository;
    private final JwtAuthenticationSupport jwtAuthenticationSupport;
    private final IReputationAuditLogRepository reputationAuditLogRepository;

    @Transactional
    public void onReportCreated(AppUser reporter, Municipality municipality) {
        int delta = municipality != null ? municipality.getReputationDeltaReportCreated() : DELTA_REPORT_CREATED;
        applyDelta(reporter.getId(), delta, "REPORT_CREATED");
    }

    @Transactional
    public void onReportResolved(Report report) {
        if (report.getReporter() == null) {
            return;
        }
        int delta = report.getMunicipality() != null ? report.getMunicipality().getReputationDeltaReportResolved() : DELTA_REPORT_RESOLVED;
        applyDelta(report.getReporter().getId(), delta, "REPORT_RESOLVED");
    }

    @Transactional
    public void onReportRejected(Report report, boolean selfieRelated) {
        if (report.getReporter() == null) {
            return;
        }
        Municipality muni = report.getMunicipality();
        int delta = selfieRelated 
                ? (muni != null ? muni.getReputationDeltaInappropriateMedia() : DELTA_SELFIE_REJECTED)
                : (muni != null ? muni.getReputationDeltaReportRejected() : DELTA_REPORT_REJECTED);
        applyDelta(report.getReporter().getId(), delta, selfieRelated ? "SELFIE_REJECTED" : "REPORT_REJECTED");

        // Ban check: count rejected reports for the user in the last autoSuspensionDays
        int threshold = muni != null ? muni.getAutoSuspensionThreshold() : 5;
        int days = muni != null ? muni.getAutoSuspensionDays() : 30;

        java.time.LocalDateTime since = java.time.LocalDateTime.now().minusDays(days);
        long rejectedCount = reportRepository.countAutoRejectedReports(
                report.getReporter().getId(), since);
        if (rejectedCount >= threshold) {
            userRepository.findById(report.getReporter().getId()).ifPresent(user -> {
                if (isCitizen(user)) {
                    user.setSuspendedUntil(java.time.LocalDateTime.now().plusDays(days));
                    user.setSuspensionReason("Çok sayıda otomatik reddedilen (uygunsuz içerikli) ihbar kaydı oluşturma.");
                    userRepository.save(user);
                    jwtAuthenticationSupport.evictCache(user.getEmail());
                    log.warn("Kullanıcı çok sayıda asılsız veya uygunsuz ihbar nedeniyle otomatik askıya alındı: userId={}, email={}, suspendedUntil={}", 
                            user.getId(), user.getEmail(), user.getSuspendedUntil());
                }
            });
        }
    }

    @Transactional
    public void applyDelta(String userId, int delta, String reason) {
        userRepository.findById(userId).ifPresent(user -> {
            if (!isCitizen(user)) {
                return;
            }
            int prev = user.getReputationScore();
            int next = clamp(prev + delta);
            user.setReputationScore(next);

            // Sadakat puanını güncelle (ödül alımı/iptali haricindeki durumlar için)
            if (!"REWARD_REDEEM".equals(reason) && !"REWARD_CANCELLED".equals(reason)) {
                int prevLoyalty = user.getLoyaltyPoints();
                int nextLoyalty = Math.max(0, prevLoyalty + delta);
                user.setLoyaltyPoints(nextLoyalty);
            }

            userRepository.save(user);
            jwtAuthenticationSupport.evictCache(user.getEmail());

            // Save to audit logs
            ReputationAuditLog auditLog = ReputationAuditLog.builder()
                    .user(user)
                    .previousScore(prev)
                    .newScore(next)
                    .delta(delta)
                    .reason(reason)
                    .build();
            reputationAuditLogRepository.save(auditLog);

            log.info("Vatandaş güven puanı güncellendi: user={} delta={} reason={} yeni={}",
                    userId, delta, reason, next);
        });
    }

    @Transactional
    public void deductLoyaltyPoints(String userId, int points) {
        userRepository.findById(userId).ifPresent(user -> {
            if (!isCitizen(user)) {
                return;
            }
            int prev = user.getLoyaltyPoints();
            int next = Math.max(0, prev - points);
            user.setLoyaltyPoints(next);
            userRepository.save(user);
            jwtAuthenticationSupport.evictCache(user.getEmail());
            log.info("Vatandaş sadakat puanı düşüldü: user={} düşülen={} yeni={}",
                    userId, points, next);
        });
    }

    @Transactional
    public void refundLoyaltyPoints(String userId, int points) {
        userRepository.findById(userId).ifPresent(user -> {
            if (!isCitizen(user)) {
                return;
            }
            int prev = user.getLoyaltyPoints();
            int next = prev + points;
            user.setLoyaltyPoints(next);
            userRepository.save(user);
            jwtAuthenticationSupport.evictCache(user.getEmail());
            log.info("Vatandaş sadakat puanı iade edildi: user={} iade={} yeni={}",
                    userId, points, next);
        });
    }

    public static String levelForScore(int score) {
        if (score >= 800) {
            return "Şehir Kahramanı";
        }
        if (score >= 500) {
            return "Şehir Gönüllüsü";
        }
        if (score >= 250) {
            return "Aktif Vatandaş";
        }
        if (score >= 100) {
            return "Güvenilir Üye";
        }
        return "Yeni Üye";
    }

    public static boolean isSelfieReason(String reason) {
        if (reason == null) {
            return false;
        }
        String r = reason.toLowerCase();
        return r.contains("selfie") || r.contains("yüz") || r.contains("yuz") || r.contains("face")
                || r.contains("müstehcen") || r.contains("çıplak") || r.contains("violence")
                || r.contains("şiddet") || r.contains("uygunsuz") || r.contains("güvenlik")
                || r.contains("obscenity") || r.contains("illegal");
    }

    private static boolean isCitizen(AppUser user) {
        return user.hasRole("ROLE_CITIZEN")
                && !user.hasRole("ROLE_ADMIN")
                && !user.hasRole("ROLE_SUPER_ADMIN")
                && !user.hasRole("ROLE_FIELD_OFFICER")
                && !user.hasRole("ROLE_DEPT_MANAGER");
    }

    private static int clamp(int value) {
        return Math.max(MIN_SCORE, Math.min(MAX_SCORE, value));
    }
}
