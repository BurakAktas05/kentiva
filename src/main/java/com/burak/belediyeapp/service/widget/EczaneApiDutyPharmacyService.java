package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.dto.response.widget.PharmacyWidgetItem;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.service.geo.NominatimReverseGeocodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Türkiye nöbetçi eczane verisi — EczaneAPI (eczane odaları kaynaklı, doğrulanmış nöbet kayıtları).
 * API anahtarı yoksa liste boş döner; OSM / tahmini eczane gösterilmez.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EczaneApiDutyPharmacyService {

    private static final String BASE = "https://eczaneapi.com/api/v1";

    @Value("${app.widgets.eczane-api.key:}")
    private String apiKey;

    private final NominatimReverseGeocodeService geocodeService;
    private final RestClient client = RestClient.create();

    public record PharmacyQueryResult(List<PharmacyWidgetItem> pharmacies, String dataSource, boolean configured) {}

    public PharmacyQueryResult findOnDuty(Municipality municipality, double lat, double lng, int limit) {
        if (apiKey == null || apiKey.isBlank()) {
            return new PharmacyQueryResult(List.of(), null, false);
        }
        List<PharmacyWidgetItem> nearby = fetchNearby(lat, lng, limit);
        if (!nearby.isEmpty()) {
            return new PharmacyQueryResult(nearby, "EczaneAPI — nöbetçi eczane (konum)", true);
        }
        String citySlug = municipality.getWidgetCitySlug();
        String districtSlug = municipality.getWidgetDistrictSlug();
        if (citySlug == null || citySlug.isBlank()) {
            Optional<NominatimReverseGeocodeService.AdminArea> area = geocodeService.resolve(lat, lng);
            if (area.isPresent()) {
                citySlug = area.get().provinceSlug();
                districtSlug = area.get().districtSlug();
            }
        }
        if (citySlug == null || citySlug.isBlank()) {
            return new PharmacyQueryResult(List.of(), "EczaneAPI", true);
        }
        List<PharmacyWidgetItem> byDistrict = fetchOnDutyByDistrict(citySlug, districtSlug, lat, lng, limit);
        return new PharmacyQueryResult(byDistrict, "EczaneAPI — nöbetçi eczane (il/ilçe)", true);
    }

    private List<PharmacyWidgetItem> fetchNearby(double lat, double lng, int limit) {
        try {
            String url = String.format(
                    "%s/pharmacies/nearby?latitude=%s&longitude=%s&radius=8",
                    BASE, lat, lng);
            String body = get(url);
            return parsePharmacyList(body, lat, lng, limit, true);
        } catch (Exception e) {
            log.debug("EczaneAPI nearby kullanılamadı (plan veya kota): {}", e.getMessage());
            return List.of();
        }
    }

    private List<PharmacyWidgetItem> fetchOnDutyByDistrict(
            String citySlug, String districtSlug, double lat, double lng, int limit) {
        try {
            StringBuilder url = new StringBuilder(BASE)
                    .append("/pharmacies/on-duty?city=")
                    .append(citySlug);
            if (districtSlug != null && !districtSlug.isBlank()) {
                url.append("&district=").append(districtSlug);
            }
            String body = get(url.toString());
            return parsePharmacyList(body, lat, lng, limit, true);
        } catch (Exception e) {
            log.warn("EczaneAPI on-duty sorgusu başarısız: {}", e.getMessage());
            return List.of();
        }
    }

    private String get(String url) {
        return client.get()
                .uri(url)
                .header("X-API-Key", apiKey)
                .header("Accept", "application/json")
                .retrieve()
                .body(String.class);
    }

    private List<PharmacyWidgetItem> parsePharmacyList(
            String body, double userLat, double userLng, int limit, boolean onDutyOnly) {
        if (body == null || body.isBlank()) {
            return List.of();
        }
        JSONObject root = new JSONObject(body);
        if (!root.optBoolean("success", false)) {
            return List.of();
        }
        JSONObject data = root.optJSONObject("data");
        if (data == null) {
            return List.of();
        }
        JSONArray pharmacies = data.optJSONArray("pharmacies");
        if (pharmacies == null) {
            return List.of();
        }
        List<PharmacyWidgetItem> items = new ArrayList<>();
        for (int i = 0; i < pharmacies.length(); i++) {
            JSONObject p = pharmacies.getJSONObject(i);
            JSONObject loc = p.optJSONObject("location");
            double plat = loc != null ? loc.optDouble("latitude", Double.NaN) : Double.NaN;
            double plng = loc != null ? loc.optDouble("longitude", Double.NaN) : Double.NaN;
            Double distKm = p.has("distance") && !p.isNull("distance")
                    ? p.optDouble("distance")
                    : null;
            double distM = distKm != null
                    ? distKm * 1000
                    : (Double.isNaN(plat) ? Double.MAX_VALUE : haversineMeters(userLat, userLng, plat, plng));
            JSONObject duty = p.optJSONObject("duty");
            boolean verified = duty != null && duty.optBoolean("isVerified", true);
            items.add(new PharmacyWidgetItem(
                    p.optString("name", "Eczane"),
                    p.optString("address", ""),
                    distM == Double.MAX_VALUE ? null : distM,
                    Double.isNaN(plat) ? null : plat,
                    Double.isNaN(plng) ? null : plng,
                    onDutyOnly,
                    p.optString("phone", null),
                    verified));
        }
        return items.stream()
                .sorted(Comparator.comparingDouble(p -> p.distanceMeters() != null ? p.distanceMeters() : 1e9))
                .limit(limit)
                .toList();
    }

    private static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
