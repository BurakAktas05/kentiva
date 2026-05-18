package com.burak.belediyeapp.dto.response.widget;

import java.util.List;

public record HomeWidgetsResponse(
        WeatherWidgetResponse weather,
        List<PharmacyWidgetItem> pharmacies,
        boolean pharmacyApiConfigured,
        String pharmacyDataSource,
        List<MunicipalityOutageDto> outages,
        List<MunicipalityEventDto> events
) {}
