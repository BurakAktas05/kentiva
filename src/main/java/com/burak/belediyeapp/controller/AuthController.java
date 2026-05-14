package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.auth.LoginRequest;
import com.burak.belediyeapp.dto.request.auth.RefreshTokenRequest;
import com.burak.belediyeapp.dto.request.auth.RegisterRequest;
import com.burak.belediyeapp.dto.response.auth.AuthResponse;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.auth.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Kimlik Doğrulama", description = "Kayıt, giriş ve token yenileme işlemleri")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Vatandaş kaydı")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {

        AuthResponse response = authService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Kayıt başarılı, hoş geldiniz!", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Kullanıcı girişi")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Giriş başarılı", response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Access token yenileme")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {

        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Çıkış — tüm refresh tokenlar iptal edilir")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal AppUser currentUser) {

        authService.logout(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Çıkış yapıldı", null));
    }

    @GetMapping("/me")
    @Operation(summary = "Mevcut oturum sahibi kullanıcı bilgilerini getir")
    public ResponseEntity<ApiResponse<AuthMeResponse>> getCurrentUser(
            @AuthenticationPrincipal AppUser currentUser) {

        var roles = currentUser.getRoles().stream()
                .map(r -> r.getName())
                .collect(java.util.stream.Collectors.toSet());

        var municipality = com.burak.belediyeapp.dto.response.municipality.MunicipalityDto.fromEntity(
                currentUser.getMunicipality());

        AuthMeResponse response = new AuthMeResponse(
                currentUser.getId(),
                currentUser.getEmail(),
                currentUser.getFullName(),
                roles,
                currentUser.getDistrict(),
                municipality
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    public record AuthMeResponse(
            String userId,
            String email,
            String fullName,
            java.util.Set<String> roles,
            String district,
            com.burak.belediyeapp.dto.response.municipality.MunicipalityDto municipality
    ) {}
}
