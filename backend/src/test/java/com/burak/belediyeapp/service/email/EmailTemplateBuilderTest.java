package com.burak.belediyeapp.service.email;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EmailTemplateBuilderTest {

    private final EmailTemplateBuilder builder = new EmailTemplateBuilder();

    @Test
    void testBuildReportStatusUpdateEmail() {
        String html = builder.buildReportStatusUpdateEmail(
                "Ahmet Yılmaz",
                "REP-10492",
                "Çevre ve Temizlik",
                "Çözüldü",
                "Kadıköy Belediyesi",
                "2026-07-30",
                "https://kentiva.app/reports/10492"
        );

        assertNotNull(html);
        assertTrue(html.contains("Kadıköy Belediyesi"));
        assertTrue(html.contains("Ahmet Yılmaz"));
        assertTrue(html.contains("#REP-10492"));
        assertTrue(html.contains("Çözüldü"));
        assertTrue(html.contains("https://kentiva.app/reports/10492"));
    }

    @Test
    void testBuildScheduledExportEmail() {
        String html = builder.buildScheduledExportEmail(
                "Mehmet Demir",
                "Aylık İhbar İstatistikleri",
                "Safranbolu Belediyesi",
                "150 satır",
                "2026-07-30 12:00"
        );

        assertNotNull(html);
        assertTrue(html.contains("Safranbolu Belediyesi"));
        assertTrue(html.contains("Mehmet Demir"));
        assertTrue(html.contains("Aylık İhbar İstatistikleri"));
        assertTrue(html.contains("150 satır"));
    }
}
