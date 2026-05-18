package com.burak.belediyeapp.db;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class MigrationHygieneTest {

    @Test
    void mockSeedMigrationsAreNotInProductionFlywayPath() {
        Path prodMigrationPath = Path.of("src/main/resources/db/migration");

        assertThat(prodMigrationPath.resolve("V19__insert_safranbolu_test_data.sql")).doesNotExist();
        assertThat(prodMigrationPath.resolve("V20__insert_mock_reports.sql")).doesNotExist();
        assertThat(prodMigrationPath.resolve("V21__insert_mock_report_media.sql")).doesNotExist();
        assertThat(prodMigrationPath.resolve("V24__add_safranbolu_demo_data.sql")).doesNotExist();
    }

    @Test
    void flywayVersionNumbersAreUnique() throws Exception {
        Path prodMigrationPath = Path.of("src/main/resources/db/migration");
        var versions = Files.list(prodMigrationPath)
                .filter(p -> p.getFileName().toString().matches("V\\d+__.*\\.sql"))
                .map(p -> {
                    String name = p.getFileName().toString();
                    return name.substring(1, name.indexOf("__"));
                })
                .toList();

        var duplicates = versions.stream()
                .collect(java.util.stream.Collectors.groupingBy(v -> v, java.util.stream.Collectors.counting()))
                .entrySet().stream()
                .filter(e -> e.getValue() > 1)
                .map(java.util.Map.Entry::getKey)
                .toList();

        assertThat(duplicates)
                .as("Duplicate Flyway versions: %s", duplicates)
                .isEmpty();
    }

    @Test
    void productionV15DoesNotSeedDefaultSuperAdmin() throws Exception {
        String v15 = Files.readString(Path.of("src/main/resources/db/migration/V15__insert_seed_data.sql"));
        assertThat(v15).doesNotContain("admin@kentiva.app");
        assertThat(v15).doesNotContain("uuid-admin-user");
    }

    @Test
    void devMockReportsUseCurrentReportStatusEnumValues() throws Exception {
        String mockReports = Files.readString(Path.of("src/main/resources/db/dev-migration/V91__insert_mock_reports.sql"));

        assertThat(mockReports).doesNotContain("'IN_PROGRESS'");
        assertThat(mockReports).contains("'PROCESSING'");
    }
}
