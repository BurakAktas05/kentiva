package com.burak.belediyeapp.service.geo;

import lombok.extern.slf4j.Slf4j;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

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
            .build();

    /**
     * Nominatim'den ilçe adına göre GeoJSON poligon çeker.
     *
     * @param districtName  İlçe adı (örn. "Safranbolu")
     * @param cityName      Şehir adı (örn. "Karabük") — opsiyonel, null bırakılabilir
     * @param countryCode   ISO ülke kodu (örn. "TR")
     * @return GeoJSON string (ST_GeomFromGeoJSON ile kullanılabilir) ya da empty
     */
    public Optional<String> fetchGeoJson(String districtName, String cityName, String countryCode) {
        try {
            // Rate-limit: Nominatim ToS gereği en az 1 sn bekleme
            Thread.sleep(1100);

            String q = cityName != null && !cityName.isBlank()
                    ? districtName + ", " + cityName + ", " + countryCode
                    : districtName + ", " + countryCode;

            String url = NOMINATIM_BASE + "/search?q=" + encode(q)
                    + "&format=json&polygon_geojson=1&addressdetails=0&limit=1"
                    + "&featuretype=settlement";

            String body = http.get().uri(url).retrieve().body(String.class);
            if (body == null || body.isBlank() || body.equals("[]")) {
                // featuretype=settlement bulamadıysa daha geniş ara
                url = NOMINATIM_BASE + "/search?q=" + encode(q)
                        + "&format=json&polygon_geojson=1&addressdetails=0&limit=1";
                body = http.get().uri(url).retrieve().body(String.class);
            }

            if (body == null || body.isBlank() || body.equals("[]")) {
                log.warn("OSM Nominatim sonuç bulunamadı: {}", q);
                return Optional.empty();
            }

            JSONArray arr = new JSONArray(body);
            if (arr.isEmpty()) {
                log.warn("OSM Nominatim boş sonuç: {}", q);
                return Optional.empty();
            }

            JSONObject first = arr.getJSONObject(0);
            JSONObject geojson = first.optJSONObject("geojson");
            if (geojson == null) {
                log.warn("OSM Nominatim GeoJSON yok: {}", q);
                return Optional.empty();
            }

            log.info("OSM boundary çekildi: {} — tür: {}", q, geojson.optString("type"));
            return Optional.of(geojson.toString());

        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception e) {
            log.error("OSM boundary çekme hatası: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static String encode(String s) {
        return s.replace(" ", "+").replace(",", "%2C");
    }

    private static SimpleClientHttpRequestFactory factory() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(8_000);
        f.setReadTimeout(15_000);
        return f;
    }
}
