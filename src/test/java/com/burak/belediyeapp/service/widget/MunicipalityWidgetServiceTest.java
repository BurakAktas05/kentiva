package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.dto.response.widget.PharmacyWidgetItem;
import com.burak.belediyeapp.dto.response.widget.WeatherWidgetResponse;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.repository.IMunicipalityEventRepository;
import com.burak.belediyeapp.repository.IMunicipalityOutageRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MunicipalityWidgetServiceTest {

    @Mock IMunicipalityRepository municipalityRepository;
    @Mock IMunicipalityOutageRepository outageRepository;
    @Mock IMunicipalityEventRepository eventRepository;
    @Mock OpenMeteoWeatherService weatherService;
    @Mock EczaneApiDutyPharmacyService dutyPharmacyService;
    @Mock EczanelerGenTrService eczanelerGenTrService;

    private MunicipalityWidgetService service;

    @BeforeEach
    void setUp() {
        service = new MunicipalityWidgetService(
                municipalityRepository,
                outageRepository,
                eventRepository,
                weatherService,
                dutyPharmacyService,
                eczanelerGenTrService);
    }

    @Test
    void homeBundleUsesUserCoordinatesForWeatherWhenProvided() {
        Municipality municipality = municipality();
        when(municipalityRepository.findById("m1")).thenReturn(Optional.of(municipality));
        when(weatherService.fetch(41.0123, 28.9876)).thenReturn(weather());
        when(dutyPharmacyService.findOnDuty(municipality, 41.0123, 28.9876, 5))
                .thenReturn(new EczaneApiDutyPharmacyService.PharmacyQueryResult(List.of(), null, false));
        when(eczanelerGenTrService.fetchOnDuty(municipality, 41.0123, 28.9876, 5)).thenReturn(List.of());
        when(outageRepository.findByMunicipalityIdAndActiveTrueOrderByStartsAtDesc("m1")).thenReturn(List.of());
        when(eventRepository.findByMunicipalityIdAndActiveTrueAndStartsAtAfterOrderByStartsAtAsc(eq("m1"), any(LocalDateTime.class)))
                .thenReturn(List.of());

        service.homeBundle("m1", 41.0123, 28.9876);

        verify(weatherService).fetch(41.0123, 28.9876);
    }

    @Test
    void homeBundleFallsBackToMunicipalityCenterWhenCoordinatesInvalid() {
        Municipality municipality = municipality();
        when(municipalityRepository.findById("m1")).thenReturn(Optional.of(municipality));
        when(weatherService.fetch(40.991, 29.111)).thenReturn(weather());
        when(dutyPharmacyService.findOnDuty(municipality, Double.NaN, Double.NaN, 5))
                .thenReturn(new EczaneApiDutyPharmacyService.PharmacyQueryResult(List.of(), null, false));
        when(eczanelerGenTrService.fetchOnDuty(municipality, Double.NaN, Double.NaN, 5)).thenReturn(List.of());
        when(outageRepository.findByMunicipalityIdAndActiveTrueOrderByStartsAtDesc("m1")).thenReturn(List.of());
        when(eventRepository.findByMunicipalityIdAndActiveTrueAndStartsAtAfterOrderByStartsAtAsc(eq("m1"), any(LocalDateTime.class)))
                .thenReturn(List.of());

        service.homeBundle("m1", Double.NaN, Double.NaN);

        verify(weatherService).fetch(40.991, 29.111);
    }

    private static Municipality municipality() {
        Municipality municipality = new Municipality();
        municipality.setId("m1");
        municipality.setCenterLat(40.991);
        municipality.setCenterLng(29.111);
        return municipality;
    }

    private static WeatherWidgetResponse weather() {
        return new WeatherWidgetResponse(
                true,
                21.0,
                20.0,
                55,
                11.0,
                0.0,
                24.0,
                16.0,
                1,
                "Parcali bulutlu",
                null,
                null,
                null,
                null,
                "Open-Meteo");
    }
}
