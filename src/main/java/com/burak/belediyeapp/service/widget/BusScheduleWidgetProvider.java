package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.entity.Municipality;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Otobüs seferleri entegrasyonu için şablon / örnek widget sağlayıcı.
 * Belediye otobüs seferleri API'si sağladığında bu sınıf gerçek HTTP çağrıları yapacak şekilde güncellenecektir.
 */
@Component
@Slf4j
public class BusScheduleWidgetProvider implements IMunicipalityWidgetProvider {

    @Override
    public String getWidgetKey() {
        return "bus-schedules";
    }

    @Override
    public String getWidgetTitle() {
        return "Otobüs Seferleri";
    }

    @Override
    public Optional<Object> fetchWidgetData(Municipality municipality, double lat, double lng) {
        // Entegrasyon aktif değilse veya belediyenin misType ayarlarından kontrol edilip kapatılmışsa boş dönebilir.
        // Şimdilik sistemin çalışırlığını göstermek amacıyla mock veriler dönüyoruz.
        try {
            log.info("Fetching bus schedules for municipality: {}, lat: {}, lng: {}", municipality.getName(), lat, lng);
            
            // Gerçek senaryoda burası belediye API'sine HTTP isteği atacaktır.
            List<Map<String, Object>> departures = List.of(
                    Map.of(
                            "lineCode", "19T",
                            "lineName", "Ferhatpaşa - Kadıköy",
                            "destination", "Kadıköy",
                            "etaMinutes", 8,
                            "status", "ON_TIME"
                    ),
                    Map.of(
                            "lineCode", "14A",
                            "lineName", "Alemdağ - Kadıköy",
                            "destination", "Kadıköy",
                            "etaMinutes", 15,
                            "status", "DELAYED"
                    ),
                    Map.of(
                            "lineCode", "11ÜS",
                            "lineName", "Sultanbeyli - Üsküdar",
                            "destination", "Üsküdar",
                            "etaMinutes", 22,
                            "status", "ON_TIME"
                    )
            );

            Map<String, Object> result = Map.of(
                    "municipalityId", municipality.getId(),
                    "dataSource", "Belediye Ulaşım API (Simüle Edilmiş)",
                    "departures", departures,
                    "lastUpdated", java.time.LocalDateTime.now().toString()
            );

            return Optional.of(result);
        } catch (Exception e) {
            log.error("Failed to fetch bus schedules widget: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
