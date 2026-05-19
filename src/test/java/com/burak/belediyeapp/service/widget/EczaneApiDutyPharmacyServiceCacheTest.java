package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.config.CacheNames;
import com.burak.belediyeapp.config.LocalCacheConfig;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.service.geo.NominatimReverseGeocodeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest(
        classes = {EczaneApiDutyPharmacyService.class, LocalCacheConfig.class},
        properties = "app.cache.type=none")
@EnableCaching
@TestPropertySource(properties = "app.widgets.eczane-api.key=test-key")
class EczaneApiDutyPharmacyServiceCacheTest {

    @MockBean
    NominatimReverseGeocodeService geocodeService;

    @Autowired
    EczaneApiDutyPharmacyService service;

    @Autowired
    CacheManager cacheManager;

    @Test
    void secondFindOnDutyUsesCacheWithoutExtraGeocodeCalls() {
        Municipality municipality = new Municipality();
        municipality.setId("m-cache");
        municipality.setWidgetCitySlug("istanbul");
        municipality.setWidgetDistrictSlug("kadikoy");

        EczaneApiDutyPharmacyService.PharmacyQueryResult first =
                service.findOnDuty(municipality, 41.0, 29.0, 5);
        EczaneApiDutyPharmacyService.PharmacyQueryResult second =
                service.findOnDuty(municipality, 41.0, 29.0, 5);

        assertThat(second).isEqualTo(first);
        verify(geocodeService, times(0)).resolve(anyDouble(), anyDouble());

        var cache = cacheManager.getCache(CacheNames.DUTY_PHARMACY);
        assertThat(cache).isNotNull();
        String cacheKey = DutyPharmacyCacheKeys.key("m-cache", "istanbul", "kadikoy");
        assertThat(cache.get(cacheKey, EczaneApiDutyPharmacyService.PharmacyQueryResult.class)).isNotNull();
    }
}
