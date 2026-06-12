package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.integration.CreateApiKeyRequest;
import com.burak.belediyeapp.dto.request.integration.WebhookSettingsRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.integration.ApiKeyCreatedResponse;
import com.burak.belediyeapp.dto.response.integration.ApiKeyListItemResponse;
import com.burak.belediyeapp.dto.response.integration.WebhookSettingsResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.WebhookDeliveryLog;
import com.burak.belediyeapp.service.integration.MunicipalityApiKeyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/municipalities/me")
@RequiredArgsConstructor
@Tag(name = "Entegrasyon", description = "API anahtarları ve webhook ayarları (belediye admin)")
public class MunicipalityApiKeyController {

    private final MunicipalityApiKeyService apiKeyService;

    @GetMapping("/api-keys")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Belediye API anahtarlarını listele")
    public ResponseEntity<ApiResponse<List<ApiKeyListItemResponse>>> listKeys(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(apiKeyService.listKeys(user)));
    }

    @PostMapping("/api-keys")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Yeni API anahtarı oluştur (düz metin yalnızca bir kez döner)")
    public ResponseEntity<ApiResponse<ApiKeyCreatedResponse>> createKey(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody CreateApiKeyRequest request) {
        ApiKeyCreatedResponse created = apiKeyService.createKey(user, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("API anahtarı oluşturuldu. Anahtarı güvenli bir yerde saklayın; tekrar gösterilmez.", created));
    }

    @DeleteMapping("/api-keys/{keyId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "API anahtarını iptal et")
    public ResponseEntity<ApiResponse<Void>> revokeKey(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String keyId) {
        apiKeyService.revokeKey(user, keyId);
        return ResponseEntity.ok(ApiResponse.success("API anahtarı iptal edildi.", null));
    }

    @GetMapping("/integration/webhook")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Giden webhook ayarlarını getir")
    public ResponseEntity<ApiResponse<WebhookSettingsResponse>> getWebhook(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(apiKeyService.getWebhookSettings(user)));
    }

    @PatchMapping("/integration/webhook")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Giden webhook ayarlarını güncelle")
    public ResponseEntity<ApiResponse<WebhookSettingsResponse>> patchWebhook(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody WebhookSettingsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(apiKeyService.updateWebhookSettings(user, request)));
    }

    @GetMapping("/integration/webhook/logs")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Giden webhook gönderim loglarını listele")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<WebhookDeliveryLog>>> getWebhookLogs(
            @AuthenticationPrincipal AppUser user,
            @org.springframework.data.web.PageableDefault(size = 20, sort = "createdAt,desc") org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(apiKeyService.getWebhookLogs(user, pageable)));
    }
}
