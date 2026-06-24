package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.setup.BootstrapSuperAdminRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.setup.SetupStatusResponse;
import com.burak.belediyeapp.service.setup.PlatformSetupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.burak.belediyeapp.security.RateLimit;

@RestController
@RequestMapping("/api/v1/setup")
@RequiredArgsConstructor
@Tag(name = "Platform Kurulum", description = "İlk süper admin — yalnızca sistemde süper admin yokken")
public class SetupController {

    private final PlatformSetupService platformSetupService;

    @GetMapping("/status")
    @RateLimit(requests = 10, window = 60)
    @Operation(summary = "Kurulum gerekli mi?")
    public ResponseEntity<ApiResponse<SetupStatusResponse>> status() {
        return ResponseEntity.ok(ApiResponse.success(platformSetupService.status()));
    }

    @PostMapping("/bootstrap-super-admin")
    @RateLimit(requests = 3, window = 60)
    @Operation(summary = "İlk süper admin hesabını oluştur (X-Setup-Token gerekli)")
    public ResponseEntity<ApiResponse<Void>> bootstrap(
            @RequestHeader(value = "X-Setup-Token", required = false) String setupToken,
            @Valid @RequestBody BootstrapSuperAdminRequest request) {
        platformSetupService.bootstrapSuperAdmin(request, setupToken);
        return ResponseEntity.ok(ApiResponse.success("Süper admin oluşturuldu. Giriş yapabilirsiniz.", null));
    }
}
