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
     * GPS noktasının düştüğü ilçe belediyesi id'sini döner.
     * Önce sınır poligonu ({@code boundaries}) ile eşleşme; yoksa merkez noktaya 25 km içi (elle
     * oluşturulan belediyelerde poligon olmayabilir).
     */
    public Optional<String> resolveDistrict(double latitude, double longitude) {
        String sql = """
                SELECT id FROM municipalities m
                WHERE m.type = 'DISTRICT'
                  AND m.active = true
                  AND COALESCE(m.onboarded, true) = true
                  AND (
                    (m.boundaries IS NOT NULL
                        AND ST_Contains(m.boundaries, ST_SetSRID(ST_MakePoint(?, ?), 4326)))
                    OR
                    (m.boundaries IS NULL
                        AND ST_DWithin(
                            ST_SetSRID(ST_MakePoint(m.center_lng, m.center_lat), 4326)::geography,
                            ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                            25000
                        ))
                  )
                ORDER BY
                    CASE WHEN m.boundaries IS NOT NULL THEN 0 ELSE 1 END,
                    ST_Distance(
                        ST_SetSRID(ST_MakePoint(m.center_lng, m.center_lat), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
                    )
                LIMIT 1
                """;
        try {
            List<String> ids = jdbcTemplate.query(
                    sql,
                    (rs, row) -> rs.getString(1),
                    longitude,
                    latitude,
                    longitude,
                    latitude,
                    longitude,
                    latitude);
            return ids.stream().findFirst();
        } catch (Exception e) {
            log.warn("İlçe çözümlemesi başarısız: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
