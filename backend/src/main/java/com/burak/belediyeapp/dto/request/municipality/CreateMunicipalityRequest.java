package com.burak.belediyeapp.dto.request.municipality;

import com.burak.belediyeapp.entity.MunicipalityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Süper admin: yeni belediye kaydı.
 */
public record CreateMunicipalityRequest(
        @NotBlank String name,
        @NotNull MunicipalityType type,
        String parentMunicipalityId,
        String slug,
        String displayName,
        Double centerLat,
        Double centerLng,
        Integer defaultZoom,
        String slogan,
        Long districtId,
        String memberId
) {}
