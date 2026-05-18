package com.burak.belediyeapp.service.municipality;

import com.burak.belediyeapp.dto.request.municipality.CreateMunicipalityRequest;
import com.burak.belediyeapp.dto.request.municipality.GenerateNotificationTemplateRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityPatchRequest;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.dto.response.municipality.NotificationTemplateAiResponse;
import com.burak.belediyeapp.service.ai.GeminiService;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.SubscriptionPlan;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.config.EvictMunicipalityCaches;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.service.geo.MunicipalityBoundaryAutoSyncService;
import com.burak.belediyeapp.service.media.MediaGuardClient;
import com.burak.belediyeapp.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MunicipalityManagementService {

    private final IMunicipalityRepository municipalityRepository;
    private final StorageService storageService;
    private final MediaGuardClient mediaGuardClient;
    private final GeminiService geminiService;
    private final MunicipalityBoundaryAutoSyncService boundaryAutoSyncService;

    @Transactional(readOnly = true)
    public List<MunicipalityDto> listAll() {
        return municipalityRepository.findAll().stream()
                .map(MunicipalityDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public MunicipalityDto getById(String municipalityId) {
        Municipality m = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        return MunicipalityDto.fromEntity(m);
    }

    @Transactional(readOnly = true)
    public MunicipalityDto getForCurrentUser(AppUser user) {
        if (user.getMunicipality() == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        return MunicipalityDto.fromEntity(user.getMunicipality());
    }

    @Transactional
    @EvictMunicipalityCaches
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
                .slogan(req.slogan() != null && !req.slogan().isBlank() ? req.slogan().trim() : null)
                .active(true)
                .onboarded(true)
                .publicStatsEnabled(false)
                .subscriptionPlan(SubscriptionPlan.TRIAL)
                .subscriptionEndsAt(LocalDateTime.now().plusDays(30));
        Municipality entity = b.build();
        if (req.parentMunicipalityId() != null && !req.parentMunicipalityId().isBlank()) {
            Municipality parent = municipalityRepository.findById(req.parentMunicipalityId())
                    .orElseThrow(() -> new ResourceNotFoundException("Belediye", "parentId", req.parentMunicipalityId()));
            entity.setParentMunicipality(parent);
        }
        Municipality saved = municipalityRepository.save(entity);
        log.info("Yeni belediye oluşturuldu: {} ({})", saved.getName(), saved.getId());
        // Sınır OpenStreetMap'ten otomatik çekilsin — admin manuel girmek zorunda kalmaz.
        // Asenkron + REQUIRES_NEW transaction; create yanıtını bloklamaz.
        boundaryAutoSyncService.syncAsync(saved.getId());
        return MunicipalityDto.fromEntity(saved);
    }

    @Transactional
    @EvictMunicipalityCaches
    public MunicipalityDto patchBySuperAdmin(String municipalityId, MunicipalityPatchRequest patch) {
        Municipality m = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        applyPatch(m, patch, true);
        return MunicipalityDto.fromEntity(municipalityRepository.save(m));
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
        if (superAdminFields) {
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
        m.setLogoUrl(url);
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
