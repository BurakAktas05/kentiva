package com.burak.belediyeapp.dto.response.widget;

public record WeatherWidgetResponse(
        boolean available,
        Double temperatureC,
        Double apparentTemperatureC,
        Integer humidityPercent,
        Double windSpeedKmh,
        Double precipitationMm,
        Double dailyMaxC,
        Double dailyMinC,
        Integer weatherCode,
        String description,
        Integer usAqi,
        String aqiLabel,
        Double pm25,
        Double pm10,
        String dataSource
) {}
