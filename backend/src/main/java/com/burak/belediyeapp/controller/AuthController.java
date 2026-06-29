package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.auth.LoginRequest;
import com.burak.belediyeapp.dto.request.auth.RefreshTokenRequest;
import com.burak.belediyeapp.dto.request.auth.RegisterRequest;
import com.burak.belediyeapp.dto.response.auth.AuthResponse;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.security.RateLimit;
import com.burak.belediyeapp.service.auth.AuthService;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Kimlik Doğrulama", description = "Kayıt, giriş ve token yenileme işlemleri")
public class AuthController {

    private final AuthService authService;
    private final MediaSignedUrlService mediaSignedUrlService;

    @PostMapping("/register/otp")
    @RateLimit(requests = 3, window = 60)
    @Operation(summary = "Vatandaş kaydı için telefon doğrulama kodu gönder")
    public ResponseEntity<ApiResponse<Map<String, String>>> sendRegistrationOtp(
            @RequestBody Map<String, String> body) {
        String phone = body.get("phoneNumber");
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Telefon numarası gereklidir.", "MISSING_PHONE"));
        }
        String devOtpCode = authService.sendRegistrationOtp(phone);
        Map<String, String> data = devOtpCode == null
                ? Map.of()
                : Map.of("devOtpCode", devOtpCode);
        return ResponseEntity.ok(ApiResponse.success("Doğrulama kodu gönderildi.", data));
    }

    @PostMapping("/register")
    @RateLimit(requests = 5, window = 300)
    @Operation(summary = "Vatandaş kaydı")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {

        AuthResponse response = authService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Kayıt başarılı, hoş geldiniz!", response));
    }

    @PostMapping("/login")
    @RateLimit(requests = 5, window = 60)
    @Operation(summary = "Kullanıcı girişi")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Giriş başarılı", response));
    }

    @PostMapping("/refresh")
    @RateLimit(requests = 20, window = 60)
    @Operation(summary = "Access token yenileme")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {

        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Çıkış — tüm refresh tokenlar iptal edilir")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal AppUser currentUser,
            jakarta.servlet.http.HttpServletRequest request) {

        String authHeader = request.getHeader("Authorization");
        authService.logout(currentUser.getId(), authHeader);
        return ResponseEntity.ok(ApiResponse.success("Çıkış yapıldı", null));
    }

    @GetMapping("/me")
    @Operation(summary = "Mevcut oturum sahibi kullanıcı bilgilerini getir")
    public ResponseEntity<ApiResponse<AuthMeResponse>> getCurrentUser(
            @AuthenticationPrincipal AppUser currentUser) {

        Set<String> roles = currentUser.getRoles().stream()
                .map(role -> role.getName())
                .collect(Collectors.toSet());

        MunicipalityDto municipality = MunicipalityDto.fromEntity(
                currentUser.getMunicipality(), mediaSignedUrlService);

        String departmentId = currentUser.getDepartment() != null ? currentUser.getDepartment().getId() : null;
        String departmentName = currentUser.getDepartment() != null ? currentUser.getDepartment().getName() : null;

        AuthMeResponse response = new AuthMeResponse(
                currentUser.getId(),
                currentUser.getEmail(),
                currentUser.getFullName(),
                roles,
                currentUser.getDistrict(),
                municipality,
                departmentId,
                departmentName
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/forgot-password")
    @RateLimit(requests = 3, window = 60)
    @Operation(summary = "Şifre sıfırlama — telefon numarasına OTP gönder")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @RequestBody Map<String, String> body) {
        String phone = body.get("phoneNumber");
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Telefon numarası gereklidir.", "MISSING_PHONE"));
        }
        authService.sendPasswordResetOtp(phone);
        return ResponseEntity.ok(ApiResponse.success("Doğrulama kodu gönderildi.", null));
    }

    @PostMapping("/reset-password")
    @RateLimit(requests = 5, window = 300)
    @Operation(summary = "Şifre sıfırlama — OTP ile yeni şifre belirle")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @RequestBody Map<String, String> body) {
        String phone = body.get("phoneNumber");
        String otp = body.get("otpCode");
        String newPassword = body.get("newPassword");
        if (phone == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Telefon, doğrulama kodu ve yeni şifre gereklidir.", "MISSING_FIELDS"));
        }
        if (newPassword.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Yeni şifre gereklidir.", "WEAK_PASSWORD"));
        }
        authService.resetPasswordWithOtp(phone, otp, newPassword);
        return ResponseEntity.ok(ApiResponse.success("Şifreniz başarıyla sıfırlandı.", null));
    }

    public record AuthMeResponse(
            String userId,
            String email,
            String fullName,
            Set<String> roles,
            String district,
            MunicipalityDto municipality,
            String departmentId,
            String departmentName
    ) {}
}
