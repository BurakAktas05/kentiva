package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.dto.response.widget.MunicipalityEventDto;
import com.burak.belediyeapp.dto.response.widget.MunicipalityOutageDto;
import com.burak.belediyeapp.dto.response.widget.PharmacyWidgetItem;
import com.burak.belediyeapp.dto.response.widget.WeatherWidgetResponse;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityEventRepository;
import com.burak.belediyeapp.repository.IMunicipalityOutageRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import com.burak.belediyeapp.dto.response.widget.HomeWidgetsResponse;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MunicipalityWidgetService {

    private final IMunicipalityRepository municipalityRepository;
    private final IMunicipalityOutageRepository outageRepository;
    private final IMunicipalityEventRepository eventRepository;
    private final OpenMeteoWeatherService weatherService;
    private final EczaneApiDutyPharmacyService dutyPharmacyService;
    private final EczanelerGenTrService eczanelerGenTrService;

    /**
     * Home widget aggregator.
     *
     * Önemli: bu metot @Transactional DEĞİL. Dışsal HTTP çağrıları (Open-Meteo, EczaneAPI,
     * eczaneler.gen.tr scrape) sırasında DB connection bekletmemek için belediyeyi
     * kısa bir read-only transaction'da çekip kapatırız, sonra HTTP'leri ağ kuyruğunda yaparız.
     */
    public HomeWidgetsResponse homeBundle(String municipalityId, double lat, double lng) {
        Municipality m = loadMunicipality(municipalityId);

        boolean hasUserCoords = hasUsableCoordinates(lat, lng);
        double widgetLat = hasUserCoords
                ? lat
                : (m.getCenterLat() != null ? m.getCenterLat() : lat);
        double widgetLng = hasUserCoords
                ? lng
                : (m.getCenterLng() != null ? m.getCenterLng() : lng);

        WeatherWidgetResponse weather = weatherService.fetch(widgetLat, widgetLng);
        EczaneApiDutyPharmacyService.PharmacyQueryResult pharmacyResult =
                dutyPharmacyService.findOnDuty(m, lat, lng, 5);

        List<PharmacyWidgetItem> pharmacies = pharmacyResult.pharmacies();
        String pharmacyDataSource = pharmacyResult.dataSource();
        boolean pharmacyConfigured = pharmacyResult.configured();

        // EczaneAPI anahtarı yok ya da listede o ilçeye dair on-duty kayıt yoksa,
        // ücretsiz / anahtarsız eczaneler.gen.tr (Türk Eczacılar Odası listesi) sayfasından
        // YALNIZCA bugünün nöbetçi eczanelerini scrape ederiz. Sadece nöbetçileri gösterir.
        if (pharmacies == null || pharmacies.isEmpty()) {
            List<PharmacyWidgetItem> fallback = eczanelerGenTrService.fetchOnDuty(m, lat, lng, 5);
            if (!fallback.isEmpty()) {
                pharmacies = fallback;
                pharmacyDataSource = "eczaneler.gen.tr — bugünün nöbetçi eczaneleri";
                pharmacyConfigured = true;
            }
        }

        List<MunicipalityOutageDto> outages = listOutages(municipalityId);
        List<MunicipalityEventDto> events = listEvents(municipalityId);

        return new HomeWidgetsResponse(
                weather,
                pharmacies,
                pharmacyConfigured,
                pharmacyDataSource,
                outages,
                events);
    }

    private static boolean hasUsableCoordinates(double lat, double lng) {
        return Double.isFinite(lat)
                && Double.isFinite(lng)
                && lat >= -90 && lat <= 90
                && lng >= -180 && lng <= 180;
    }

    @Transactional(readOnly = true)
    protected Municipality loadMunicipality(String municipalityId) {
        return municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
    }

    @Transactional(readOnly = true)
    public List<MunicipalityOutageDto> listOutages(String municipalityId) {
        return outageRepository.findByMunicipalityIdAndActiveTrueOrderByStartsAtDesc(municipalityId).stream()
                .map(o -> new MunicipalityOutageDto(
                        o.getId(),
                        o.getOutageType(),
                        o.getTitle(),
                        o.getDistrict(),
                        o.getMessage(),
                        o.getStartsAt(),
                        o.getEndsAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MunicipalityEventDto> listEvents(String municipalityId) {
        return eventRepository
                .findByMunicipalityIdAndActiveTrueAndStartsAtAfterOrderByStartsAtAsc(
                        municipalityId, LocalDateTime.now().minusDays(1))
                .stream()
                .map(e -> new MunicipalityEventDto(
                        e.getId(),
                        e.getTitle(),
                        e.getVenue(),
                        e.getDescription(),
                        e.getStartsAt(),
                        e.getEndsAt(),
                        e.getExternalUrl()))
                .toList();
    }
}
