package com.burak.belediyeapp.dto.response.municipality;

public record AdminDistrictCatalogDto(
        Long id,
        String memberId,
        String plateCode,
        String districtSlug,
        String nameTr,
        boolean onboarded,
        String municipalityId,
        String boundaryStatus,
        Long osmId
) {}
