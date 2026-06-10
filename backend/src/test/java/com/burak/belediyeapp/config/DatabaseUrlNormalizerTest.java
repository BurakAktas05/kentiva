package com.burak.belediyeapp.config;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DatabaseUrlNormalizerTest {

    @Test
    void convertsPostgresqlUrlToJdbcAndCredentials() {
        Map<String, Object> props = DatabaseUrlNormalizer.normalizeFromDatabaseUrl(
                "postgresql://user:secret@db.example.com:5432/railway");

        assertThat(props.get("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://db.example.com:5432/railway");
        assertThat(props.get("spring.datasource.username")).isEqualTo("user");
        assertThat(props.get("spring.datasource.password")).isEqualTo("secret");
    }

    @Test
    void leavesJdbcUrlUntouched() {
        assertThat(DatabaseUrlNormalizer.normalizeFromDatabaseUrl(
                "jdbc:postgresql://localhost:5432/app")).isEmpty();
    }
}
