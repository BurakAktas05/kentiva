package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.dto.response.widget.WeatherWidgetResponse;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Hava durumu — ücretsiz, anahtarsız Open-Meteo (ECMWF + GFS karışımı).
 *
 * İki ayrı endpoint kullanılır çünkü Open-Meteo hava ve hava kalitesini farklı
 * servislerden sunar:
 *   • api.open-meteo.com/v1/forecast         → sıcaklık, hissedilen, rüzgar, kod, günlük min/max
 *   • air-quality-api.open-meteo.com/v1/...  → US AQI, PM2.5, PM10
 *
 * Hava kalitesi çağrısı sessizce başarısız olabilir; ana hava verisi yine de döner.
 */
@Service
@Slf4j
public class OpenMeteoWeatherService {

    private static final String FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";
    private static final String AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";

    private final RestClient client = RestClient.builder()
            .requestFactory(factory())
            .defaultHeader("Accept", "application/json")
            .build();

    public WeatherWidgetResponse fetch(double lat, double lng) {
        WeatherCore core;
        try {
            core = fetchCore(lat, lng);
        } catch (Exception e) {
            log.warn("Open-Meteo forecast hatası: {}", e.getMessage());
            return unavailable();
        }
        if (core == null) {
            return unavailable();
        }

        AirQuality air = null;
        try {
            air = fetchAirQuality(lat, lng);
        } catch (Exception e) {
            // Hava kalitesi opsiyonel — başarısızlık tüm widget'ı düşürmemeli.
            log.debug("Open-Meteo air-quality kullanılamadı: {}", e.getMessage());
        }

        return new WeatherWidgetResponse(
                true,
                core.temperatureC,
                core.apparentTemperatureC,
                core.humidityPercent,
                core.windSpeedKmh,
                core.precipitationMm,
                core.dailyMaxC,
                core.dailyMinC,
                core.weatherCode,
                weatherDescription(core.weatherCode),
                air != null ? air.usAqi : null,
                air != null ? aqiLabel(air.usAqi) : null,
                air != null ? air.pm25 : null,
                air != null ? air.pm10 : null,
                "Open-Meteo (ECMWF/GFS modeli)");
    }

    private WeatherCore fetchCore(double lat, double lng) {
        String url = String.format(
                "%s?latitude=%s&longitude=%s"
                        + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,"
                        + "weather_code,wind_speed_10m,precipitation"
                        + "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
                        + "&forecast_days=1&timezone=auto",
                FORECAST_BASE, lat, lng);

        String body = client.get().uri(url).retrieve().body(String.class);
        if (body == null || body.isBlank()) {
            return null;
        }
        JSONObject root = new JSONObject(body);
        JSONObject current = root.optJSONObject("current");
        if (current == null || !current.has("temperature_2m")) {
            return null;
        }
        WeatherCore c = new WeatherCore();
        c.temperatureC = optDouble(current, "temperature_2m");
        c.apparentTemperatureC = optDouble(current, "apparent_temperature");
        c.humidityPercent = current.has("relative_humidity_2m")
                ? current.optInt("relative_humidity_2m", 0)
                : null;
        c.windSpeedKmh = optDouble(current, "wind_speed_10m");
        c.precipitationMm = optDouble(current, "precipitation");
        c.weatherCode = current.has("weather_code") ? current.optInt("weather_code", 0) : null;

        JSONObject daily = root.optJSONObject("daily");
        if (daily != null) {
            c.dailyMaxC = firstDouble(daily.optJSONArray("temperature_2m_max"));
            c.dailyMinC = firstDouble(daily.optJSONArray("temperature_2m_min"));
        }
        return c;
    }

    private AirQuality fetchAirQuality(double lat, double lng) {
        String url = String.format(
                "%s?latitude=%s&longitude=%s&current=us_aqi,pm2_5,pm10",
                AIR_QUALITY_BASE, lat, lng);
        String body = client.get().uri(url).retrieve().body(String.class);
        if (body == null || body.isBlank()) {
            return null;
        }
        JSONObject root = new JSONObject(body);
        JSONObject current = root.optJSONObject("current");
        if (current == null) {
            return null;
        }
        AirQuality a = new AirQuality();
        a.usAqi = current.has("us_aqi") && !current.isNull("us_aqi")
                ? current.optInt("us_aqi") : null;
        a.pm25 = optDouble(current, "pm2_5");
        a.pm10 = optDouble(current, "pm10");
        return a;
    }

    private static Double optDouble(JSONObject o, String key) {
        if (o == null || !o.has(key) || o.isNull(key)) {
            return null;
        }
        try {
            return o.getDouble(key);
        } catch (Exception e) {
            return null;
        }
    }

    private static Double firstDouble(JSONArray arr) {
        if (arr == null || arr.isEmpty()) {
            return null;
        }
        if (arr.isNull(0)) {
            return null;
        }
        try {
            return arr.getDouble(0);
        } catch (Exception e) {
            return null;
        }
    }

    private static WeatherWidgetResponse unavailable() {
        return new WeatherWidgetResponse(
                false, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null);
    }

    private static String weatherDescription(Integer code) {
        if (code == null) {
            return "Bilinmiyor";
        }
        return switch (code) {
            case 0 -> "Açık";
            case 1, 2, 3 -> "Parçalı bulutlu";
            case 45, 48 -> "Sis";
            case 51, 53, 55, 56, 57 -> "Çisenti";
            case 61, 63, 65, 66, 67, 80, 81, 82 -> "Yağmurlu";
            case 71, 73, 75, 77, 85, 86 -> "Karlı";
            case 95, 96, 99 -> "Fırtınalı";
            default -> "Değişken";
        };
    }

    private static String aqiLabel(Integer aqi) {
        if (aqi == null) return null;
        if (aqi <= 50) return "İyi";
        if (aqi <= 100) return "Orta";
        if (aqi <= 150) return "Hassas gruplar için risk";
        if (aqi <= 200) return "Sağlıksız";
        if (aqi <= 300) return "Çok sağlıksız";
        return "Tehlikeli";
    }

    private static SimpleClientHttpRequestFactory factory() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(6_000);
        f.setReadTimeout(10_000);
        return f;
    }

    private static final class WeatherCore {
        Double temperatureC;
        Double apparentTemperatureC;
        Integer humidityPercent;
        Double windSpeedKmh;
        Double precipitationMm;
        Double dailyMaxC;
        Double dailyMinC;
        Integer weatherCode;
    }

    private static final class AirQuality {
        Integer usAqi;
        Double pm25;
        Double pm10;
    }
}
