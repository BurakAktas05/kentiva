package com.burak.belediyeapp.service.publicapi;

import com.burak.belediyeapp.dto.response.publicapi.PublicCategoryStatDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicMonthlyStatDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicMunicipalityStatDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicStatsOverviewDto;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Kamuya açık istatistikler — kişisel veri, açıklama, medya veya tam koordinat dönmez.
 */
@Service
@RequiredArgsConstructor
public class PublicStatsService {

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public PublicStatsOverviewDto overview() {
        Long total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM reports", Long.class);
        Long resolved = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reports WHERE report_status = 'RESOLVED'", Long.class);
        Long muni = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM municipalities WHERE onboarded = true AND active = true", Long.class);
        long t = total != null ? total : 0;
        long r = resolved != null ? resolved : 0;
        double rate = t == 0 ? 0.0 : Math.round((r * 10000.0 / t)) / 100.0;
        return new PublicStatsOverviewDto(t, r, rate, muni != null ? muni : 0);
    }

    @Transactional(readOnly = true)
    public List<PublicCategoryStatDto> byCategory() {
        String sql = """
                SELECT c.name AS category_name, COUNT(*) AS cnt
                FROM reports r
                JOIN report_categories c ON r.category_id = c.id
                GROUP BY c.name
                ORDER BY cnt DESC
                LIMIT 30
                """;
        return jdbcTemplate.query(sql, (rs, i) -> new PublicCategoryStatDto(
                rs.getString("category_name"),
                rs.getLong("cnt")
        ));
    }

    @Transactional(readOnly = true)
    public List<PublicMonthlyStatDto> monthly() {
        String sql = """
                SELECT TO_CHAR(date_trunc('month', r.created_at), 'YYYY-MM') AS ym,
                       COUNT(*) AS opened,
                       SUM(CASE WHEN r.report_status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved
                FROM reports r
                WHERE r.created_at >= (CURRENT_TIMESTAMP - INTERVAL '24 months')
                GROUP BY date_trunc('month', r.created_at)
                ORDER BY ym DESC
                LIMIT 24
                """;
        return jdbcTemplate.query(sql, (rs, i) -> new PublicMonthlyStatDto(
                rs.getString("ym"),
                rs.getLong("opened"),
                rs.getLong("resolved")
        ));
    }

    @Transactional(readOnly = true)
    public List<PublicMunicipalityStatDto> byMunicipality() {
        String sql = """
                SELECT m.slug,
                       COALESCE(NULLIF(TRIM(m.display_name), ''), m.name) AS display_name,
                       COUNT(*) AS total_reports,
                       SUM(CASE WHEN r.report_status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_reports
                FROM reports r
                JOIN municipalities m ON r.municipality_id = m.id
                WHERE m.public_stats_enabled = true
                GROUP BY m.slug, display_name
                ORDER BY total_reports DESC
                LIMIT 50
                """;
        return jdbcTemplate.query(sql, (rs, i) -> new PublicMunicipalityStatDto(
                rs.getString("slug"),
                rs.getString("display_name"),
                rs.getLong("total_reports"),
                rs.getLong("resolved_reports")
        ));
    }
}
