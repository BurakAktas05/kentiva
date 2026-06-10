package com.burak.belediyeapp.service.analytics;

import com.burak.belediyeapp.dto.response.dashboard.PredictiveInsightDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PredictiveMaintenanceService {

    private final IReportRepository reportRepository;

    @Transactional(readOnly = true)
    public List<PredictiveInsightDto> getInsights(AppUser user) {
        String municipalityId = resolveMunicipalityId(user);
        List<Object[]> rows = reportRepository.findPredictiveHotspots(municipalityId);
        List<PredictiveInsightDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            String category = stringAt(row, 0);
            String district = stringAt(row, 1);
            long recent = numberAt(row, 2);
            long prev = numberAt(row, 3);
            long open = numberAt(row, 4);
            double trend = prev <= 0 ? (recent > 0 ? 2.0 : 0) : (double) recent / prev;
            String risk = trend >= 1.5 || open >= 5 ? "HIGH" : trend >= 1.1 || open >= 3 ? "MEDIUM" : "LOW";
            String recommendation = buildRecommendation(category, district, recent, open, risk);
            result.add(new PredictiveInsightDto(category, district, recent, prev, open, round(trend), risk, recommendation));
        }
        return result;
    }

    private static String buildRecommendation(String category, String district, long recent, long open, String risk) {
        if ("HIGH".equals(risk)) {
            return String.format(
                    "%s / %s bölgesinde son 30 günde %d yeni bildirim ve %d açık kayıt var. Önleyici bakım ekibi planlanmalı.",
                    category, district, recent, open);
        }
        if ("MEDIUM".equals(risk)) {
            return String.format("%s kategorisinde artış gözleniyor (%d bildirim). Rutin kontrol önerilir.", category, recent);
        }
        return String.format("%s — %s bölgesi izlemede; şimdilik rutin öncelik yeterli.", category, district);
    }

    private static String resolveMunicipalityId(AppUser user) {
        if (user.hasRole("ROLE_SUPER_ADMIN")) {
            throw new BusinessException("Tahminsel analiz belediye kapsamında çalışır.", "MUNICIPALITY_REQUIRED");
        }
        if (user.getMunicipality() == null) {
            throw new BusinessException("Belediye atanmamış hesap.", "MUNICIPALITY_REQUIRED");
        }
        return user.getMunicipality().getId();
    }

    private static String stringAt(Object[] row, int i) {
        return row[i] != null ? row[i].toString() : "";
    }

    private static long numberAt(Object[] row, int i) {
        if (row[i] == null) return 0;
        if (row[i] instanceof Number n) return n.longValue();
        return Long.parseLong(row[i].toString());
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
