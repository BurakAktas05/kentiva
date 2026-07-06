package com.burak.belediyeapp.service.municipality;

import com.burak.belediyeapp.dto.request.municipality.CreateMunicipalityRequest;
import com.burak.belediyeapp.dto.request.municipality.GenerateNotificationTemplateRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityPatchRequest;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityBoundaryDto;
import com.burak.belediyeapp.dto.response.municipality.NotificationTemplateAiResponse;
import com.burak.belediyeapp.service.ai.GeminiService;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.SubscriptionPlan;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.config.EvictMunicipalityCaches;
import com.burak.belediyeapp.config.PilotProperties;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.ITurkeyDistrictRepository;
import com.burak.belediyeapp.entity.TurkeyDistrict;
import com.burak.belediyeapp.service.geo.MunicipalityBoundaryAutoSyncService;
import com.burak.belediyeapp.service.media.MediaGuardClient;
import com.burak.belediyeapp.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MunicipalityManagementService {

    private final IMunicipalityRepository municipalityRepository;
    private final ITurkeyDistrictRepository turkeyDistrictRepository;
    private final com.burak.belediyeapp.repository.ITurkeyProvinceRepository turkeyProvinceRepository;
    private final StorageService storageService;
    private final MediaGuardClient mediaGuardClient;
    private final GeminiService geminiService;
    private final MunicipalityBoundaryAutoSyncService boundaryAutoSyncService;
    private final com.burak.belediyeapp.service.media.MediaSignedUrlService mediaSignedUrlService;
    private final PilotProperties pilotProperties;

    @Transactional(readOnly = true)
    public Page<MunicipalityDto> listAll(Pageable pageable) {
        return municipalityRepository.findAll(pageable)
                .map(m -> MunicipalityDto.fromEntity(m, mediaSignedUrlService));
    }

    @Transactional(readOnly = true)
    public MunicipalityDto getById(String municipalityId) {
        Municipality m = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        return MunicipalityDto.fromEntity(m, mediaSignedUrlService);
    }

    @Transactional(readOnly = true)
    public MunicipalityDto getForCurrentUser(AppUser user) {
        if (user.getMunicipality() == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        return MunicipalityDto.fromEntity(user.getMunicipality(), mediaSignedUrlService);
    }

    @Transactional
    @EvictMunicipalityCaches
    public MunicipalityDto create(CreateMunicipalityRequest req) {
        TurkeyDistrict district = null;
        if (req.districtId() != null) {
            district = turkeyDistrictRepository.findById(req.districtId())
                    .orElseThrow(() -> new ResourceNotFoundException("İlçe Kataloğu", "districtId", req.districtId()));
        } else if (req.memberId() != null && !req.memberId().isBlank()) {
            district = turkeyDistrictRepository.findByMemberId(req.memberId().trim())
                    .orElseThrow(() -> new ResourceNotFoundException("İlçe Kataloğu", "memberId", req.memberId()));
        }

        if (district == null) {
            throw new BusinessException("Lütfen ilçe kataloğundan geçerli bir ilçe seçin.", "DISTRICT_REQUIRED");
        }

        boolean alreadyOnboarded = municipalityRepository.existsByDistrictIdAndOnboardedTrue(district.getId());
        if (alreadyOnboarded) {
            throw new BusinessException("Bu ilçe için zaten aktif bir belediye kaydı bulunuyor: " + district.getNameTr(), "DISTRICT_ALREADY_ONBOARDED");
        }

        String resolvedName = req.name() != null && !req.name().isBlank() ? req.name().trim() : district.getNameTr() + " Belediyesi";
        String resolvedSlug = req.slug() != null && !req.slug().isBlank() ? req.slug().trim() : district.getDistrictSlug();
        String slug = resolveUniqueSlug(resolvedSlug, resolvedName);

        double defaultLat = district.getCentroid() != null ? district.getCentroid().getY() : 41.0082;
        double defaultLng = district.getCentroid() != null ? district.getCentroid().getX() : 28.9784;

        Municipality.MunicipalityBuilder b = Municipality.builder()
                .name(resolvedName)
                .type(req.type())
                .slug(slug)
                .district(district)
                .displayName(req.displayName() != null && !req.displayName().isBlank() ? req.displayName().trim() : district.getNameTr())
                .centerLat(req.centerLat() != null ? req.centerLat() : defaultLat)
                .centerLng(req.centerLng() != null ? req.centerLng() : defaultLng)
                .defaultZoom(req.defaultZoom() != null ? req.defaultZoom() : 12)
                .slogan(req.slogan() != null && !req.slogan().isBlank() ? req.slogan().trim() : null)
                .active(true)
                .onboarded(true)
                .publicStatsEnabled(false)
                .subscriptionPlan(SubscriptionPlan.TRIAL)
                .subscriptionEndsAt(LocalDateTime.now().plusDays(pilotProperties.effectiveTrialDays()));

        Municipality entity = b.build();
        if (req.parentMunicipalityId() != null && !req.parentMunicipalityId().isBlank()) {
            Municipality parent = municipalityRepository.findById(req.parentMunicipalityId())
                    .orElseThrow(() -> new ResourceNotFoundException("Belediye", "parentId", req.parentMunicipalityId()));
            entity.setParentMunicipality(parent);
        }
        Municipality saved = municipalityRepository.save(entity);
        log.info("Yeni belediye oluşturuldu: {} ({})", saved.getName(), saved.getId());
        
        // Sınır OpenStreetMap'ten otomatik çekilsin — admin manuel girmek zorunda kalmaz.
        boundaryAutoSyncService.syncAsync(saved.getId());
        return MunicipalityDto.fromEntity(saved, mediaSignedUrlService);
    }

    @Transactional
    @EvictMunicipalityCaches
    public MunicipalityDto patchBySuperAdmin(String municipalityId, MunicipalityPatchRequest patch) {
        Municipality m = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        applyPatch(m, patch, true);
        return MunicipalityDto.fromEntity(municipalityRepository.save(m), mediaSignedUrlService);
    }

    @Transactional
    @EvictMunicipalityCaches
    public String uploadLogoForTenant(AppUser admin, MultipartFile file) {
        if (admin.getMunicipality() == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        return uploadLogo(admin.getMunicipality().getId(), file);
    }

    @Transactional
    @EvictMunicipalityCaches
    public String uploadLogoBySuperAdmin(String municipalityId, MultipartFile file) {
        if (!municipalityRepository.existsById(municipalityId)) {
            throw new ResourceNotFoundException("Belediye", "id", municipalityId);
        }
        return uploadLogo(municipalityId, file);
    }

    @Transactional
    @EvictMunicipalityCaches
    public MunicipalityDto patchOwnTenant(AppUser admin, MunicipalityPatchRequest patch) {
        if (admin.getMunicipality() == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        Municipality m = municipalityRepository.findById(admin.getMunicipality().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", admin.getMunicipality().getId()));
        applyPatch(m, patch, false);
        return MunicipalityDto.fromEntity(municipalityRepository.save(m), mediaSignedUrlService);
    }

    private void applyPatch(Municipality m, MunicipalityPatchRequest p, boolean superAdminFields) {
        if (p.displayName() != null) {
            m.setDisplayName(p.displayName().isBlank() ? null : p.displayName());
        }
        if (p.logoUrl() != null) {
            m.setLogoUrl(p.logoUrl().isBlank() ? null : mediaSignedUrlService.persistableStoragePath(p.logoUrl()));
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
        if (p.centerLat() != null) {
            m.setCenterLat(p.centerLat());
        }
        if (p.centerLng() != null) {
            m.setCenterLng(p.centerLng());
        }
        if (p.defaultZoom() != null) {
            m.setDefaultZoom(p.defaultZoom());
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
        if (p.smsResolvedTemplate() != null) {
            m.setSmsResolvedTemplate(p.smsResolvedTemplate().isBlank() ? null : p.smsResolvedTemplate());
        }
        if (p.pushRejectedTitleTemplate() != null) {
            m.setPushRejectedTitleTemplate(p.pushRejectedTitleTemplate().isBlank() ? null : p.pushRejectedTitleTemplate());
        }
        if (p.pushRejectedBodyTemplate() != null) {
            m.setPushRejectedBodyTemplate(p.pushRejectedBodyTemplate().isBlank() ? null : p.pushRejectedBodyTemplate());
        }
        if (p.smsSenderHeader() != null) {
            m.setSmsSenderHeader(p.smsSenderHeader().isBlank() ? null : p.smsSenderHeader().trim());
        }
        if (p.smsProcessingTemplate() != null) {
            m.setSmsProcessingTemplate(p.smsProcessingTemplate().isBlank() ? null : p.smsProcessingTemplate());
        }
        if (p.pushProcessingTitleTemplate() != null) {
            m.setPushProcessingTitleTemplate(
                    p.pushProcessingTitleTemplate().isBlank() ? null : p.pushProcessingTitleTemplate());
        }
        if (p.pushProcessingBodyTemplate() != null) {
            m.setPushProcessingBodyTemplate(
                    p.pushProcessingBodyTemplate().isBlank() ? null : p.pushProcessingBodyTemplate());
        }
        if (p.smsAssignedTemplate() != null) {
            m.setSmsAssignedTemplate(p.smsAssignedTemplate().isBlank() ? null : p.smsAssignedTemplate());
        }
        if (p.pushAssignedTitleTemplate() != null) {
            m.setPushAssignedTitleTemplate(p.pushAssignedTitleTemplate().isBlank() ? null : p.pushAssignedTitleTemplate());
        }
        if (p.pushAssignedBodyTemplate() != null) {
            m.setPushAssignedBodyTemplate(p.pushAssignedBodyTemplate().isBlank() ? null : p.pushAssignedBodyTemplate());
        }
        if (p.publicStatsEnabled() != null) {
            m.setPublicStatsEnabled(p.publicStatsEnabled());
        }
        if (p.allowMunicipalityRejection() != null) {
            m.setAllowMunicipalityRejection(p.allowMunicipalityRejection());
        }
        if (p.reputationDeltaReportCreated() != null) {
            m.setReputationDeltaReportCreated(p.reputationDeltaReportCreated());
        }
        if (p.reputationDeltaReportResolved() != null) {
            m.setReputationDeltaReportResolved(p.reputationDeltaReportResolved());
        }
        if (p.reputationDeltaReportRejected() != null) {
            m.setReputationDeltaReportRejected(p.reputationDeltaReportRejected());
        }
        if (p.reputationDeltaInappropriateMedia() != null) {
            m.setReputationDeltaInappropriateMedia(p.reputationDeltaInappropriateMedia());
        }
        if (p.autoSuspensionThreshold() != null) {
            m.setAutoSuspensionThreshold(p.autoSuspensionThreshold());
        }
        if (p.autoSuspensionDays() != null) {
            m.setAutoSuspensionDays(p.autoSuspensionDays());
        }
        if (p.aiMediaModerationEnabled() != null) {
            m.setAiMediaModerationEnabled(p.aiMediaModerationEnabled());
        }
        if (superAdminFields) {
            if (p.workflowMode() != null && !p.workflowMode().isBlank()) {
                m.setWorkflowMode(com.burak.belediyeapp.entity.WorkflowMode.valueOf(p.workflowMode().trim().toUpperCase()));
            }
            if (p.active() != null) {
                m.setActive(p.active());
            }
            if (p.onboarded() != null) {
                m.setOnboarded(p.onboarded());
            }
            if (p.subscriptionPlan() != null && !p.subscriptionPlan().isBlank()) {
                m.setSubscriptionPlan(SubscriptionPlan.valueOf(p.subscriptionPlan().trim().toUpperCase()));
            }
            if (p.subscriptionEndsAt() != null) {
                m.setSubscriptionEndsAt(p.subscriptionEndsAt());
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

    private String uploadLogo(String municipalityId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Logo dosyası gerekli", "FILE_REQUIRED");
        }
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/")) {
            throw new BusinessException("Yalnızca görüntü dosyaları yüklenebilir.", "INVALID_MEDIA_TYPE");
        }
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new BusinessException("Logo en fazla 2 MB olabilir.", "FILE_TOO_LARGE");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new BusinessException("Dosya okunamadı.", "FILE_READ_ERROR");
        }
        mediaGuardClient.validateImageOrThrow(bytes, ct);
        String url = storageService.uploadBytes(bytes, ct, "branding/" + municipalityId, file.getOriginalFilename());
        Municipality m = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        m.setLogoUrl(mediaSignedUrlService.persistableStoragePath(url));
        municipalityRepository.save(m);
        return url;
    }

    @Transactional(readOnly = true)
    public NotificationTemplateAiResponse generateNotificationTemplate(
            AppUser user,
            GenerateNotificationTemplateRequest.NotificationTemplateKind kind) {
        if (user.getMunicipality() == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        return generateForMunicipality(user.getMunicipality(), kind);
    }

    @Transactional(readOnly = true)
    public NotificationTemplateAiResponse generateNotificationTemplateForSuperAdmin(
            String municipalityId,
            GenerateNotificationTemplateRequest.NotificationTemplateKind kind) {
        Municipality m = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        return generateForMunicipality(m, kind);
    }

    private NotificationTemplateAiResponse generateForMunicipality(
            Municipality m,
            GenerateNotificationTemplateRequest.NotificationTemplateKind kind) {
        String display = m.getDisplayName() != null && !m.getDisplayName().isBlank()
                ? m.getDisplayName()
                : m.getName();
        String text = geminiService.generateNotificationTemplate(display, m.getSlogan(), kind);
        if (text == null || text.isBlank()) {
            text = com.burak.belediyeapp.service.ai.NotificationTemplateFallbacks.forKind(kind, display);
        }
        return new NotificationTemplateAiResponse(text.trim());
    }

    @Transactional
    @EvictMunicipalityCaches
    public void updateBoundaries(String id, String geoJson) {
        if (!municipalityRepository.existsById(id)) {
            throw new ResourceNotFoundException("Belediye", "id", id);
        }
        municipalityRepository.updateBoundariesFromGeoJson(id, geoJson);
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

    @Transactional(readOnly = true)
    public List<com.burak.belediyeapp.dto.response.publicapi.PublicProvinceDto> listProvincesForAdmin() {
        return turkeyProvinceRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "nameTr")).stream()
                .map(p -> new com.burak.belediyeapp.dto.response.publicapi.PublicProvinceDto(p.getPlateCode(), p.getNameTr(), p.getSlug()))
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.burak.belediyeapp.dto.response.municipality.AdminDistrictCatalogDto> listDistrictsForAdmin(String plateCode) {
        if (plateCode != null && !plateCode.isBlank()) {
            return turkeyDistrictRepository.findAdminCatalogByProvince(plateCode.trim());
        }
        return turkeyDistrictRepository.findAllAdminCatalog();
    }

    @Transactional(readOnly = true)
    public String getDistrictBoundaryGeoJson(Long id) {
        return turkeyDistrictRepository.findBoundaryGeoJsonById(id)
                .orElseThrow(() -> new ResourceNotFoundException("İlçe Kataloğu Sınırı", "id", id));
    }

    @Transactional(readOnly = true)
    public String getMunicipalityBoundaryGeoJson(String id) {
        return turkeyDistrictRepository.findBoundaryGeoJsonByMunicipalityId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye Sınırı", "id", id));
    }

    @Transactional(readOnly = true)
    public List<MunicipalityBoundaryDto> getAllBoundariesGeoJson() {
        return municipalityRepository.findAllOnboardedBoundariesRaw().stream()
                .map(row -> new MunicipalityBoundaryDto(
                        (String) row[0],
                        (String) row[1],
                        (String) row[2],
                        (String) row[3]
                ))
                .collect(java.util.stream.Collectors.toList());
    }
}
