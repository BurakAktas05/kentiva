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
    }

    @Test
    void devMockReportsUseCurrentReportStatusEnumValues() throws Exception {
        String mockReports = Files.readString(Path.of("src/main/resources/db/dev-migration/V20__insert_mock_reports.sql"));

        assertThat(mockReports).doesNotContain("'IN_PROGRESS'");
        assertThat(mockReports).contains("'PROCESSING'");
    }
}
