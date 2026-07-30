package com.burak.belediyeapp.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProductionReadinessValidator implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Value("${app.production.require-pgvector:false}")
    private boolean requirePgvector;

    @Override
    public void run(ApplicationArguments args) {
        if (!requirePgvector) {
            return;
        }
        String columnType = jdbcTemplate.query(
                """
                SELECT udt_name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'reports'
                  AND column_name = 'title_description_vector'
                """,
                rs -> rs.next() ? rs.getString("udt_name") : null);
        if (columnType == null) {
            throw new IllegalStateException("reports.title_description_vector column is missing.");
        }
        if (!"vector".equalsIgnoreCase(columnType)) {
            throw new IllegalStateException(
                    "pgvector is required in this environment; reports.title_description_vector resolved to type: "
                            + columnType);
        }
    }
}
