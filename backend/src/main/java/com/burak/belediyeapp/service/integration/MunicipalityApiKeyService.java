package com.burak.belediyeapp.service.integration;

import com.burak.belediyeapp.dto.request.integration.CreateApiKeyRequest;
import com.burak.belediyeapp.dto.request.integration.WebhookSettingsRequest;
import com.burak.belediyeapp.dto.response.integration.ApiKeyCreatedResponse;
import com.burak.belediyeapp.dto.response.integration.ApiKeyListItemResponse;
import com.burak.belediyeapp.dto.response.integration.WebhookSettingsResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityApiKey;
import com.burak.belediyeapp.entity.WebhookDeliveryLog;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.integration.ApiKeyHasher;
import com.burak.belediyeapp.integration.ApiKeyScope;
import com.burak.belediyeapp.repository.IMunicipalityApiKeyRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IWebhookDeliveryLogRepository;
import com.burak.belediyeapp.security.SsrfProtectionInterceptor;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class MunicipalityApiKeyService {

    private final IMunicipalityApiKeyRepository apiKeyRepository;
    private final IMunicipalityRepository municipalityRepository;
    private final TenantAccessService tenantAccess;
    private final IWebhookDeliveryLogRepository webhookDeliveryLogRepository;

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<WebhookDeliveryLog> getWebhookLogs(
            AppUser admin,
            org.springframework.data.domain.Pageable pageable
    ) {
        String municipalityId = tenantAccess.requireStaffMunicipalityId(admin);
        return webhookDeliveryLogRepository.findByMunicipalityId(municipalityId, pageable);
    }

    @Transactional(readOnly = true)
    public List<ApiKeyListItemResponse> listKeys(AppUser admin) {
        String municipalityId = tenantAccess.requireStaffMunicipalityId(admin);
        return apiKeyRepository.findByMunicipalityIdOrderByCreatedAtDesc(municipalityId).stream()
                .map(ApiKeyListItemResponse::from)
                .toList();
    }

    @Transactional
    public ApiKeyCreatedResponse createKey(AppUser admin, CreateApiKeyRequest request) {
        String municipalityId = tenantAccess.requireStaffMunicipalityId(admin);
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));

        Set<String> scopes = resolveScopes(request.scopes());
        String rawKey = ApiKeyHasher.generateRawKey();

        MunicipalityApiKey entity = MunicipalityApiKey.builder()
                .municipality(municipality)
                .name(request.name().trim())
                .keyPrefix(ApiKeyHasher.prefixOf(rawKey))
                .keyHash(ApiKeyHasher.hash(rawKey))
                .scopes(String.join(",", scopes))
                .active(true)
                .build();

        MunicipalityApiKey saved = apiKeyRepository.save(entity);
        log.info("API anahtari olusturuldu: {} - belediye={}", saved.getId(), municipalityId);
        return ApiKeyCreatedResponse.of(saved, rawKey);
    }

    @Transactional
    public void revokeKey(AppUser admin, String keyId) {
        String municipalityId = tenantAccess.requireStaffMunicipalityId(admin);
        MunicipalityApiKey key = apiKeyRepository.findByIdAndMunicipalityId(keyId, municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("API anahtari", "id", keyId));
        key.setActive(false);
        apiKeyRepository.save(key);
        log.info("API anahtari iptal edildi: {}", keyId);
    }

    @Transactional(readOnly = true)
    public WebhookSettingsResponse getWebhookSettings(AppUser admin) {
        Municipality municipality = loadOwnMunicipality(admin);
        return WebhookSettingsResponse.from(municipality);
    }

    @Transactional
    public WebhookSettingsResponse updateWebhookSettings(AppUser admin, WebhookSettingsRequest request) {
        Municipality municipality = loadOwnMunicipality(admin);
        if (request.webhookUrl() != null) {
            String url = request.webhookUrl().isBlank() ? null : request.webhookUrl().trim();
            if (url != null && !url.startsWith("https://")) {
                throw new BusinessException("Webhook URL yalnizca https:// ile baslamalidir.", "INVALID_WEBHOOK_URL");
            }
            if (url != null) {
                try {
                    SsrfProtectionInterceptor.validatePublicHttpUri(url);
                } catch (Exception e) {
                    throw new BusinessException(
                            "Webhook URL yalnizca herkese acik bir https adresi olmalidir.",
                            "INVALID_WEBHOOK_URL");
                }
            }
            municipality.setWebhookUrl(url);
        }
        if (request.webhookEnabled() != null) {
            municipality.setWebhookEnabled(request.webhookEnabled());
        }
        if (request.webhookSecret() != null) {
            municipality.setWebhookSecret(request.webhookSecret().isBlank() ? null : request.webhookSecret().trim());
        }
        return WebhookSettingsResponse.from(municipalityRepository.save(municipality));
    }

    private Municipality loadOwnMunicipality(AppUser admin) {
        String municipalityId = tenantAccess.requireStaffMunicipalityId(admin);
        return municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
    }

    private static Set<String> resolveScopes(List<String> requested) {
        if (requested == null || requested.isEmpty()) {
            return ApiKeyScope.defaultScopes();
        }
        Set<String> scopes = new LinkedHashSet<>();
        for (String scope : requested) {
            if (scope == null || scope.isBlank()) {
                continue;
            }
            String code = scope.trim();
            if (!ApiKeyScope.isValid(code)) {
                throw new BusinessException("Gecersiz kapsam: " + code, "INVALID_API_KEY_SCOPE");
            }
            scopes.add(code);
        }
        if (scopes.isEmpty()) {
            return ApiKeyScope.defaultScopes();
        }
        return scopes;
    }
}
