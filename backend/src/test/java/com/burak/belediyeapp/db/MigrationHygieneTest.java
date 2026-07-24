package com.burak.belediyeapp.db;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

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
    void flywayVersionNumbersAreUniqueAcrossProductionAndDevLocations() throws Exception {
        Path prodMigrationPath = Path.of("src/main/resources/db/migration");
        Path devMigrationPath = Path.of("src/main/resources/db/dev-migration");

        var versions = Stream.concat(
                        migrationVersions(prodMigrationPath).stream(),
                        migrationVersions(devMigrationPath).stream())
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
    void gumushacikoyDemoSeedIsDevOnly() {
        Path prodMigrationPath = Path.of("src/main/resources/db/migration");
        Path devMigrationPath = Path.of("src/main/resources/db/dev-migration");
        String migrationName = "V103__seed_gumushacikoy_demo.sql";

        assertThat(devMigrationPath.resolve(migrationName)).exists();
        assertThat(prodMigrationPath.resolve(migrationName)).doesNotExist();
    }

    @Test
    void productionV15DoesNotSeedDefaultSuperAdmin() throws Exception {
        String v15 = Files.readString(Path.of("src/main/resources/db/migration/V15__insert_seed_data.sql"));
        assertThat(v15).doesNotContain("admin@kentiva.app");
        assertThat(v15).doesNotContain("uuid-admin-user");
    }

    private static List<String> migrationVersions(Path migrationPath) throws Exception {
        try (var files = Files.list(migrationPath)) {
            return files
                    .filter(p -> p.getFileName().toString().matches("V\\d+__.*\\.sql"))
                    .map(p -> {
                        String name = p.getFileName().toString();
                        return name.substring(1, name.indexOf("__"));
                    })
                    .toList();
        }
    }

}
