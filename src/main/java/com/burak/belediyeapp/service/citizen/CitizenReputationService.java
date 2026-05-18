package com.burak.belediyeapp.service.citizen;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IAppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public void onReportCreated(AppUser reporter) {
        applyDelta(reporter.getId(), DELTA_REPORT_CREATED, "REPORT_CREATED");
    }

    @Transactional
    public void onReportResolved(Report report) {
        if (report.getReporter() == null) {
            return;
        }
        applyDelta(report.getReporter().getId(), DELTA_REPORT_RESOLVED, "REPORT_RESOLVED");
    }

    @Transactional
    public void onReportRejected(Report report, boolean selfieRelated) {
        if (report.getReporter() == null) {
            return;
        }
        int delta = selfieRelated ? DELTA_SELFIE_REJECTED : DELTA_REPORT_REJECTED;
        applyDelta(report.getReporter().getId(), delta, selfieRelated ? "SELFIE_REJECTED" : "REPORT_REJECTED");
    }

    @Transactional
    public void applyDelta(String userId, int delta, String reason) {
        userRepository.findById(userId).ifPresent(user -> {
            if (!isCitizen(user)) {
                return;
            }
            int next = clamp(user.getReputationScore() + delta);
            user.setReputationScore(next);
            userRepository.save(user);
            log.info("Vatandaş puanı güncellendi: user={} delta={} reason={} yeni={}",
                    userId, delta, reason, next);
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
        return r.contains("selfie") || r.contains("yüz") || r.contains("yuz") || r.contains("face");
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
