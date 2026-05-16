package com.burak.belediyeapp.service.geo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * GPS noktasının düştüğü ilçe adını PostGIS ile çözer.
 * Veri {@code district_boundaries} tablosundan gelir (Flyway V12).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DistrictResolutionService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * GPS noktasının düştüğü belediye id'sini döner.
     * Yalnızca {@code boundaries} poligonu ile ST_Contains kontrolü yapılır.
     * Poligonu tanımlanmamış belediyeler eşleşmez — sınır verisi zorunludur.
     */
    public Optional<String> resolveDistrict(double latitude, double longitude) {
        String sql = """
                SELECT id FROM municipalities m
                WHERE m.type IN ('DISTRICT', 'METROPOLITAN')
                  AND m.active = true
                  AND COALESCE(m.onboarded, true) = true
                  AND m.boundaries IS NOT NULL
                  AND ST_Contains(m.boundaries, ST_SetSRID(ST_MakePoint(?, ?), 4326))
                LIMIT 1
                """;
        try {
            List<String> ids = jdbcTemplate.query(
                    sql,
                    (rs, row) -> rs.getString(1),
                    longitude,
                    latitude);
            return ids.stream().findFirst();
        } catch (Exception e) {
            log.warn("İlçe çözümlemesi başarısız: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
