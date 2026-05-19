package com.burak.belediyeapp.service.widget;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class DutyPharmacyCacheKeysTest {

    @Test
    void keyIncludesMunicipalitySlugsAndTodayInTurkey() {
        String key = DutyPharmacyCacheKeys.key("m1", "istanbul", "Kadikoy");
        String today = LocalDate.now(ZoneId.of("Europe/Istanbul")).toString();
        assertThat(key).isEqualTo("m1:istanbul:kadikoy:" + today);
    }

    @Test
    void keyUsesUnderscoreForBlankSlugs() {
        String key = DutyPharmacyCacheKeys.key("m2", null, "  ");
        String today = LocalDate.now(ZoneId.of("Europe/Istanbul")).toString();
        assertThat(key).isEqualTo("m2:_:_:" + today);
    }
}
