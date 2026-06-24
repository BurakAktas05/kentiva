package com.burak.belediyeapp.service.geo;

import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import com.burak.belediyeapp.security.SsrfProtectionInterceptor;

import java.util.Locale;
import java.util.Optional;
import com.burak.belediyeapp.util.SlugUtils;

/**
 * Konum → il / ilçe (Nominatim — yalnızca resmi nöbetçi eczane API sorgusu için).
 */
@Service
@Slf4j
public class NominatimReverseGeocodeService {

    private static final String USER_AGENT = "KentivaBelediyeApp/1.0 (municipal citizen app; contact: support@kentiva.app)";

    private final RestClient client = RestClient.builder()
            .requestFactory(factory())
            .defaultHeader("User-Agent", USER_AGENT)
            .defaultHeader("Accept-Language", "tr")
            .requestInterceptor(new SsrfProtectionInterceptor())
            .build();

    public record AdminArea(String provinceName, String districtName, String provinceSlug, String districtSlug) {}

    public record Coords(double lat, double lng) {}

    public Optional<Coords> geocode(String address) {
        if (address == null || address.isBlank()) {
            return Optional.empty();
        }
        try {
            String url = String.format(
                    "https://nominatim.openstreetmap.org/search?q=%s&format=json&limit=1",
                    java.net.URLEncoder.encode(address.trim(), java.nio.charset.StandardCharsets.UTF_8.name()));
            String body = client.get().uri(url).retrieve().body(String.class);
            if (body == null || body.isBlank()) {
                return Optional.empty();
            }
            org.json.JSONArray root = new org.json.JSONArray(body);
            if (root.length() == 0) {
                return Optional.empty();
            }
            JSONObject first = root.getJSONObject(0);
            double lat = first.optDouble("lat", Double.NaN);
            double lng = first.optDouble("lon", Double.NaN);
            if (Double.isNaN(lat) || Double.isNaN(lng)) {
                return Optional.empty();
            }
            return Optional.of(new Coords(lat, lng));
        } catch (Exception e) {
            log.warn("Nominatim geocode failed for address: {}. Error: {}", address, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<AdminArea> resolve(double lat, double lng) {
        try {
            String url = String.format(
                    "https://nominatim.openstreetmap.org/reverse?lat=%s&lon=%s&format=json&addressdetails=1&zoom=12",
                    lat, lng);
            String body = client.get().uri(url).retrieve().body(String.class);
            if (body == null || body.isBlank()) {
                return Optional.empty();
            }
            JSONObject root = new JSONObject(body);
            JSONObject address = root.optJSONObject("address");
            if (address == null) {
                return Optional.empty();
            }
            String province = firstNonBlank(
                    address.optString("province", null),
                    address.optString("state", null),
                    address.optString("city", null));
            String district = firstNonBlank(
                    address.optString("town", null),
                    address.optString("city_district", null),
                    address.optString("suburb", null),
                    address.optString("county", null),
                    address.optString("municipality", null));
            if (province == null) {
                return Optional.empty();
            }
            return Optional.of(new AdminArea(
                    province,
                    district != null ? district : province,
                    slugify(province),
                    slugify(district != null ? district : province)));
        } catch (Exception e) {
            log.warn("Nominatim reverse geocode başarısız: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    static String slugify(String input) {
        return SlugUtils.slugify(input);
    }

    private static SimpleClientHttpRequestFactory factory() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(6_000);
        f.setReadTimeout(10_000);
        return f;
    }
}
