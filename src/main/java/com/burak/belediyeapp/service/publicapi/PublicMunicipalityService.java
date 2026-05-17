package com.burak.belediyeapp.service.publicapi;

import com.burak.belediyeapp.dto.response.publicapi.PublicMunicipalityDetailDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicMunicipalitySummaryDto;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityType;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.service.geo.DistrictResolutionService;
import com.burak.belediyeapp.config.CacheNames;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PublicMunicipalityService {

    private final IMunicipalityRepository municipalityRepository;
    private final DistrictResolutionService districtResolutionService;

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.PUBLIC_MUNICIPALITIES, key = "'list-district'")
    public List<PublicMunicipalitySummaryDto> listDistrictMunicipalities() {
        return municipalityRepository.findActiveByTypeOrderByDisplay(MunicipalityType.DISTRICT).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.PUBLIC_MUNICIPALITIES, key = "'slug:' + #slug.toLowerCase()")
    public PublicMunicipalityDetailDto getBySlug(String slug) {
        Municipality m = municipalityRepository.findBySlugIgnoreCaseAndActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "slug", slug));
        return toDetail(m);
    }

    @Transactional(readOnly = true)
    public Optional<PublicMunicipalityDetailDto> resolveByCoordinates(double latitude, double longitude) {
        return districtResolutionService.resolveDistrict(latitude, longitude)
                .flatMap(municipalityRepository::findById)
                .filter(Municipality::isActive)
                .map(this::toDetail);
    }

    private PublicMunicipalitySummaryDto toSummary(Municipality m) {
        String display = m.getDisplayName() != null && !m.getDisplayName().isBlank()
                ? m.getDisplayName()
                : m.getName();
        return new PublicMunicipalitySummaryDto(
                m.getId(),
                m.getSlug(),
                display,
                m.getLogoUrl(),
                m.getPrimaryColor(),
                m.getSecondaryColor(),
                m.getAccentColor(),
                m.getSlogan(),
                m.getCenterLat(),
                m.getCenterLng(),
                m.isActive(),
                m.isOnboarded()
        );
    }

    private PublicMunicipalityDetailDto toDetail(Municipality m) {
        String display = m.getDisplayName() != null && !m.getDisplayName().isBlank()
                ? m.getDisplayName()
                : m.getName();
        return new PublicMunicipalityDetailDto(
                m.getId(),
                m.getSlug(),
                display,
                m.getLogoUrl(),
                m.getPrimaryColor(),
                m.getSecondaryColor(),
                m.getAccentColor(),
                m.getSlogan(),
                m.getCenterLat(),
                m.getCenterLng(),
                m.getContactEmail(),
                m.getContactPhone(),
                m.getWebsiteUrl(),
                m.isActive(),
                m.isOnboarded(),
                m.isPublicStatsEnabled()
        );
    }
}
