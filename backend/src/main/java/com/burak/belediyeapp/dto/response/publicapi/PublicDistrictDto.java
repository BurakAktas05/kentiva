package com.burak.belediyeapp.dto.response.publicapi;

public record PublicDistrictDto(
        Long id,
        String memberId,
        String plateCode,
        String districtSlug,
        String nameTr,
        boolean onboarded,
        String municipalityId
) {}
