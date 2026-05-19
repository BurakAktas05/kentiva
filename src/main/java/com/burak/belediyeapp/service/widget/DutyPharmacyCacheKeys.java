package com.burak.belediyeapp.service.widget;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Nöbetçi eczane önbellek anahtarı — belediye + il/ilçe slug + İstanbul günü.
 */
public final class DutyPharmacyCacheKeys {

    private static final ZoneId TURKEY = ZoneId.of("Europe/Istanbul");

    private DutyPharmacyCacheKeys() {
    }

    public static String key(String municipalityId, String citySlug, String districtSlug) {
        String muni = municipalityId != null ? municipalityId : "_";
        String city = slugPart(citySlug);
        String district = slugPart(districtSlug);
        String day = LocalDate.now(TURKEY).toString();
        return muni + ":" + city + ":" + district + ":" + day;
    }

    private static String slugPart(String slug) {
        if (slug == null || slug.isBlank()) {
            return "_";
        }
        return slug.trim().toLowerCase();
    }
}
