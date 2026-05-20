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

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PublicMunicipalityService {

    private final IMunicipalityRepository municipalityRepository;
    private final DistrictResolutionService districtResolutionService;

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.PUBLIC_MUNICIPALITIES, key = "'list-district'")
    public List<PublicMunicipalitySummaryDto> listDistrictMunicipalities() {
        return municipalityRepository.findOnboardedActiveByTypeWithParent(MunicipalityType.DISTRICT).stream()
                .sorted(Comparator
                        .comparing((Municipality m) -> resolveProvinceName(m), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(m -> displayOf(m), String.CASE_INSENSITIVE_ORDER))
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
                .filter(m -> m.isActive() && m.isOnboarded())
                .map(this::toDetail);
    }

    private PublicMunicipalitySummaryDto toSummary(Municipality m) {
        String display = displayOf(m);
        Municipality parent = m.getParentMunicipality();
        return new PublicMunicipalitySummaryDto(
                m.getId(),
                m.getSlug(),
                display,
                resolveProvinceName(m),
                parent != null ? parent.getId() : null,
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
        String display = displayOf(m);
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

    private static String displayOf(Municipality m) {
        if (m.getDisplayName() != null && !m.getDisplayName().isBlank()) {
            return m.getDisplayName().trim();
        }
        return m.getName();
    }

    private static String resolveProvinceName(Municipality m) {
        if (m.getParentMunicipality() != null) {
            return displayOf(m.getParentMunicipality());
        }
        if (m.getWidgetCitySlug() != null && !m.getWidgetCitySlug().isBlank()) {
            return humanizeSlug(m.getWidgetCitySlug());
        }
        return displayOf(m);
    }

    private static String humanizeSlug(String slug) {
        String normalized = slug.trim().replace('-', ' ').replace('_', ' ');
        if (normalized.isEmpty()) {
            return slug;
        }
        return normalized.substring(0, 1).toUpperCase(Locale.forLanguageTag("tr"))
                + normalized.substring(1).toLowerCase(Locale.forLanguageTag("tr"));
    }
}
