package com.burak.belediyeapp.service.municipality;

import com.burak.belediyeapp.dto.request.municipality.CreateMunicipalityRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityPatchRequest;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MunicipalityManagementService {

    private final IMunicipalityRepository municipalityRepository;

    @Transactional(readOnly = true)
    public List<MunicipalityDto> listAll() {
        return municipalityRepository.findAll().stream()
                .map(MunicipalityDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public MunicipalityDto getForCurrentUser(AppUser user) {
        if (user.getMunicipality() == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        return MunicipalityDto.fromEntity(user.getMunicipality());
    }

    @Transactional
    public MunicipalityDto create(CreateMunicipalityRequest req) {
        String slug = resolveUniqueSlug(req.slug(), req.name());
        Municipality.MunicipalityBuilder b = Municipality.builder()
                .name(req.name())
                .type(req.type())
                .slug(slug)
                .displayName(req.displayName() != null && !req.displayName().isBlank() ? req.displayName() : req.name())
                .centerLat(req.centerLat() != null ? req.centerLat() : 41.0082)
                .centerLng(req.centerLng() != null ? req.centerLng() : 28.9784)
                .defaultZoom(req.defaultZoom() != null ? req.defaultZoom() : 12)
                .active(true)
                .onboarded(true)
                .publicStatsEnabled(false);
        Municipality entity = b.build();
        if (req.parentMunicipalityId() != null && !req.parentMunicipalityId().isBlank()) {
            Municipality parent = municipalityRepository.findById(req.parentMunicipalityId())
                    .orElseThrow(() -> new ResourceNotFoundException("Belediye", "parentId", req.parentMunicipalityId()));
            entity.setParentMunicipality(parent);
        }
        Municipality saved = municipalityRepository.save(entity);
        log.info("Yeni belediye oluşturuldu: {} ({})", saved.getName(), saved.getId());
        return MunicipalityDto.fromEntity(saved);
    }

    @Transactional
    public MunicipalityDto patchBySuperAdmin(String municipalityId, MunicipalityPatchRequest patch) {
        Municipality m = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        applyPatch(m, patch, true);
        return MunicipalityDto.fromEntity(municipalityRepository.save(m));
    }

    @Transactional
    public MunicipalityDto patchOwnTenant(AppUser admin, MunicipalityPatchRequest patch) {
        if (admin.getMunicipality() == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        Municipality m = municipalityRepository.findById(admin.getMunicipality().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", admin.getMunicipality().getId()));
        applyPatch(m, patch, false);
        return MunicipalityDto.fromEntity(municipalityRepository.save(m));
    }

    private void applyPatch(Municipality m, MunicipalityPatchRequest p, boolean superAdminFields) {
        if (p.displayName() != null) {
            m.setDisplayName(p.displayName().isBlank() ? null : p.displayName());
        }
        if (p.logoUrl() != null) {
            m.setLogoUrl(p.logoUrl().isBlank() ? null : p.logoUrl());
        }
        if (p.primaryColor() != null) {
            m.setPrimaryColor(p.primaryColor().isBlank() ? null : p.primaryColor());
        }
        if (p.secondaryColor() != null) {
            m.setSecondaryColor(p.secondaryColor().isBlank() ? null : p.secondaryColor());
        }
        if (p.accentColor() != null) {
            m.setAccentColor(p.accentColor().isBlank() ? null : p.accentColor());
        }
        if (p.slogan() != null) {
            m.setSlogan(p.slogan().isBlank() ? null : p.slogan());
        }
        if (p.contactEmail() != null) {
            m.setContactEmail(p.contactEmail().isBlank() ? null : p.contactEmail());
        }
        if (p.contactPhone() != null) {
            m.setContactPhone(p.contactPhone().isBlank() ? null : p.contactPhone());
        }
        if (p.websiteUrl() != null) {
            m.setWebsiteUrl(p.websiteUrl().isBlank() ? null : p.websiteUrl());
        }
        if (p.publicStatsEnabled() != null) {
            m.setPublicStatsEnabled(p.publicStatsEnabled());
        }
        if (superAdminFields) {
            if (p.active() != null) {
                m.setActive(p.active());
            }
            if (p.onboarded() != null) {
                m.setOnboarded(p.onboarded());
            }
            if (p.slug() != null && !p.slug().isBlank()) {
                String ns = p.slug().trim();
                if (!ns.equalsIgnoreCase(m.getSlug())
                        && municipalityRepository.existsBySlugIgnoreCase(ns)) {
                    throw new BusinessException("Bu slug başka bir belediye tarafından kullanılıyor", "SLUG_TAKEN");
                }
                m.setSlug(ns);
            }
        }
    }

    private String resolveUniqueSlug(String requestedSlug, String name) {
        String base = requestedSlug != null && !requestedSlug.isBlank()
                ? requestedSlug.trim().toLowerCase()
                : "m-" + name.toLowerCase()
                        .replace('ı', 'i')
                        .replace('ğ', 'g')
                        .replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("^-|-$", "");
        if (base.isBlank()) {
            base = "m-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        }
        String candidate = base;
        int i = 1;
        while (municipalityRepository.existsBySlugIgnoreCase(candidate)) {
            candidate = base + "-" + i++;
        }
        return candidate;
    }
}
