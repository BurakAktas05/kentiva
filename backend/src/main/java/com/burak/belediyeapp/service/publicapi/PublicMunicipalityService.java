package com.burak.belediyeapp.service.publicapi;

import com.burak.belediyeapp.dto.response.publicapi.PublicMunicipalityDetailDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicMunicipalitySummaryDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicResolvedReportDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicProvinceDto;
import com.burak.belediyeapp.dto.response.publicapi.PublicDistrictDto;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityType;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.repository.ITurkeyProvinceRepository;
import com.burak.belediyeapp.repository.ITurkeyDistrictRepository;
import com.burak.belediyeapp.service.ai.GeminiService;
import com.burak.belediyeapp.service.geo.DistrictResolutionService;
import com.burak.belediyeapp.config.CacheNames;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicMunicipalityService {

    private final IMunicipalityRepository municipalityRepository;
    private final DistrictResolutionService districtResolutionService;
    private final IReportRepository reportRepository;
    private final GeminiService geminiService;
    private final JdbcTemplate jdbcTemplate;
    private final ITurkeyProvinceRepository turkeyProvinceRepository;
    private final ITurkeyDistrictRepository turkeyDistrictRepository;
    private final com.burak.belediyeapp.service.media.MediaSignedUrlService mediaSignedUrlService;

    @Transactional(readOnly = true)
    public List<PublicProvinceDto> listProvinces() {
        return turkeyProvinceRepository.findAll(Sort.by(Sort.Direction.ASC, "nameTr")).stream()
                .map(p -> new PublicProvinceDto(p.getPlateCode(), p.getNameTr(), p.getSlug()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PublicDistrictDto> listDistricts(String plateCode) {
        return turkeyDistrictRepository.findPublicDistrictsByProvince(plateCode);
    }

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
                .filter(Municipality::isActive)
                .map(this::toDetail);
    }

    private PublicMunicipalitySummaryDto toSummary(Municipality m) {
        String display = displayOf(m);
        Municipality parent = m.getParentMunicipality();
        
        String memberId = m.getDistrict() != null ? m.getDistrict().getMemberId() : null;
        String plateCode = m.getDistrict() != null && m.getDistrict().getProvince() != null 
                ? m.getDistrict().getProvince().getPlateCode() : null;
        String resolvedProvince = m.getDistrict() != null && m.getDistrict().getProvince() != null 
                ? m.getDistrict().getProvince().getNameTr() : resolveProvinceName(m);

        return new PublicMunicipalitySummaryDto(
                m.getId(),
                m.getSlug(),
                display,
                resolvedProvince,
                parent != null ? parent.getId() : null,
                mediaSignedUrlService.signForClient(m.getLogoUrl()),
                m.getPrimaryColor(),
                m.getSecondaryColor(),
                m.getAccentColor(),
                m.getSlogan(),
                m.getCenterLat(),
                m.getCenterLng(),
                m.isActive(),
                m.isOnboarded(),
                m.getReputationDeltaReportCreated(),
                m.getReputationDeltaReportResolved(),
                m.getReputationDeltaReportRejected(),
                m.getReputationDeltaInappropriateMedia(),
                m.getAutoSuspensionThreshold(),
                m.getAutoSuspensionDays(),
                memberId,
                plateCode
        );
    }

    private PublicMunicipalityDetailDto toDetail(Municipality m) {
        String display = displayOf(m);
        String memberId = m.getDistrict() != null ? m.getDistrict().getMemberId() : null;
        String plateCode = m.getDistrict() != null && m.getDistrict().getProvince() != null 
                ? m.getDistrict().getProvince().getPlateCode() : null;
        String provinceName = m.getDistrict() != null && m.getDistrict().getProvince() != null 
                ? m.getDistrict().getProvince().getNameTr() : resolveProvinceName(m);

        return new PublicMunicipalityDetailDto(
                m.getId(),
                m.getSlug(),
                display,
                mediaSignedUrlService.signForClient(m.getLogoUrl()),
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
                m.isPublicStatsEnabled(),
                memberId,
                plateCode,
                provinceName
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

    @Transactional(readOnly = true)
    public List<PublicResolvedReportDto> getResolvedReportsForPublic(String slug) {
        Municipality municipality = municipalityRepository.findBySlugIgnoreCaseAndActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "slug", slug));
        if (!municipality.isPublicStatsEnabled()) {
            throw new BusinessException(
                    "Bu belediye cozulmus ihbarlarini herkese acik olarak yayinlamiyor.",
                    "PUBLIC_CONTENT_DISABLED");
        }
        List<Report> recentResolved = reportRepository.findRecentResolvedReportsByMunicipalitySlug(slug, PageRequest.of(0, 15));
        if (recentResolved.isEmpty()) {
            return List.of();
        }

        List<String> selectedIds = null;
        try {
            selectedIds = geminiService.selectBestResolvedReports(recentResolved);
        } catch (Exception e) {
            // Ignore external AI issues
        }

        List<Report> selectedReports = new ArrayList<>();
        if (selectedIds != null && !selectedIds.isEmpty()) {
            for (String id : selectedIds) {
                recentResolved.stream()
                        .filter(r -> r.getId().equals(id))
                        .findFirst()
                        .ifPresent(selectedReports::add);
            }
        }

        if (selectedReports.isEmpty()) {
            selectedReports = recentResolved.stream().limit(3).collect(Collectors.toList());
        }

        List<PublicResolvedReportDto> dtos = new ArrayList<>();
        for (Report r : selectedReports) {
            String note = jdbcTemplate.query(
                    "SELECT note FROM report_history WHERE report_id = ? AND new_status = 'RESOLVED' ORDER BY created_at DESC LIMIT 1",
                    rs -> rs.next() ? rs.getString("note") : null,
                    r.getId()
            );
            if (note == null || note.isBlank()) {
                note = "İhbar belediyemiz ekiplerince başarıyla çözümlenmiştir.";
            }

            dtos.add(new PublicResolvedReportDto(
                    r.getId(),
                    r.getTitle(),
                    r.getDescription(),
                    r.getCategory() != null ? r.getCategory().getName() : "Genel",
                    r.getDistrict(),
                    r.getCreatedAt(),
                    r.getUpdatedAt(),
                    note
            ));
        }

        return dtos;
    }
}
