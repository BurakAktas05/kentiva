package com.burak.belediyeapp.service.geo;

import lombok.extern.slf4j.Slf4j;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import com.burak.belediyeapp.security.SsrfProtectionInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Optional;

/**
 * OpenStreetMap Nominatim API'sinden belediye/ilçe sınır poligonunu GeoJSON olarak çeker.
 *
 * Kullanım:
 *   osmBoundaryService.fetchGeoJson("Safranbolu", "Karabük", "TR")
 *
 * Dönen String PostgreSQL'e ST_GeomFromGeoJSON() ile beslenebilir.
 * Nominatim kullanım koşulları: max 1 istek/sn, User-Agent zorunlu.
 */
@Service
@Slf4j
public class OsmBoundaryService {

    private static final String NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
    private static final String USER_AGENT     = "Kentiva-SaaS/1.0 (contact@kentiva.app)";

    private final RestClient http = RestClient.builder()
            .requestFactory(factory())
            .defaultHeader("User-Agent", USER_AGENT)
            .defaultHeader("Accept", "application/json")
            .defaultHeader("Accept-Language", "tr")
            .requestInterceptor(new SsrfProtectionInterceptor())
            .build();

    /**
     * Nominatim'den ilçe adına göre GeoJSON poligon çeker.
     *
     * @param districtName  İlçe adı (örn. "Safranbolu", "Şişli", "Kadıköy")
     * @param cityName      Şehir adı (örn. "Karabük", "İstanbul") — opsiyonel, null bırakılabilir
     * @param countryCode   ISO ülke kodu (örn. "TR")
     * @return GeoJSON string (ST_GeomFromGeoJSON ile kullanılabilir) ya da empty
     */
    public Optional<String> fetchGeoJson(String districtName, String cityName, String countryCode) {
        if (districtName == null || districtName.isBlank()) {
            return Optional.empty();
        }
        String district = districtName.trim();
        String city = (cityName != null && !cityName.isBlank()) ? cityName.trim() : null;
        String country = (countryCode != null && !countryCode.isBlank()) ? countryCode.trim() : "TR";

        try {
            // Rate-limit: Nominatim ToS gereği en az 1 sn bekleme
            Thread.sleep(1100);

            // 1) Yapılandırılmış sorgu — Nominatim daha doğru eşleşme yapar.
            //    Türkiye'de ilçeler boundary/administrative tipindedir,
            //    bu yüzden featuretype=settlement bazı kayıtları kaçırabiliyor.
            Optional<String> structured = fetchStructured(district, city, country);
            if (structured.isPresent()) {
                return structured;
            }

            // 2) Düz "q=" sorgusuna düş — örn. "Şişli, İstanbul, TR"
            String q = city != null
                    ? district + ", " + city + ", " + country
                    : district + ", " + country;
            return fetchByQuery(q);

        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception e) {
            log.error("OSM boundary çekme hatası: {}", e.toString());
            return Optional.empty();
        }
    }

    private Optional<String> fetchStructured(String district, String city, String country) {
        UriComponentsBuilder b = UriComponentsBuilder.fromUriString(NOMINATIM_BASE + "/search")
                .queryParam("city", district)
                .queryParam("countrycodes", country.toLowerCase())
                .queryParam("format", "json")
                .queryParam("polygon_geojson", 1)
                .queryParam("addressdetails", 0)
                .queryParam("limit", 1);
        if (city != null) {
            b.queryParam("state", city);
        }
        return callAndExtractGeoJson(b.build().encode().toUri(), "structured(city)");
    }

    private Optional<String> fetchByQuery(String q) {
        URI uri = UriComponentsBuilder.fromUriString(NOMINATIM_BASE + "/search")
                .queryParam("q", q)
                .queryParam("format", "json")
                .queryParam("polygon_geojson", 1)
                .queryParam("addressdetails", 0)
                .queryParam("limit", 1)
                .build().encode().toUri();
        return callAndExtractGeoJson(uri, "q=" + q);
    }

    private Optional<String> callAndExtractGeoJson(URI uri, String ctx) {
        try {
            String body = http.get().uri(uri).retrieve().body(String.class);
            if (body == null || body.isBlank() || body.equals("[]")) {
                log.warn("OSM Nominatim boş sonuç ({}): {}", ctx, uri);
                return Optional.empty();
            }
            JSONArray arr = new JSONArray(body);
            if (arr.isEmpty()) {
                return Optional.empty();
            }
            JSONObject first = arr.getJSONObject(0);
            JSONObject geojson = first.optJSONObject("geojson");
            if (geojson == null) {
                log.warn("OSM Nominatim sonucu var ama geojson yok ({})", ctx);
                return Optional.empty();
            }
            String type = geojson.optString("type", "");
            if (!"Polygon".equalsIgnoreCase(type) && !"MultiPolygon".equalsIgnoreCase(type)) {
                log.warn("OSM Nominatim poligon dönmedi ({}): tür={}", ctx, type);
                return Optional.empty();
            }
            log.info("OSM boundary çekildi ({}): tür={}", ctx, type);
            return Optional.of(geojson.toString());
        } catch (Exception e) {
            log.error("OSM Nominatim çağrı hatası ({}): {}", ctx, e.toString());
            return Optional.empty();
        }
    }

    private static SimpleClientHttpRequestFactory factory() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(8_000);
        f.setReadTimeout(20_000);
        return f;
    }
}
