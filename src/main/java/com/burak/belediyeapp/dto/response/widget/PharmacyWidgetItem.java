package com.burak.belediyeapp.dto.response.widget;

public record PharmacyWidgetItem(
        String name,
        String address,
        Double distanceMeters,
        Double lat,
        Double lng,
        boolean onDuty,
        String phone,
        boolean dutyVerified
) {}
