package com.burak.belediyeapp.dto.response.municipality;

public record MunicipalityBoundaryDto(
        String id,
        String displayName,
        String name,
        String geoJson
) {}
