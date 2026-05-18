package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.user.ChangePasswordRequest;
import com.burak.belediyeapp.dto.request.user.CreateStaffRequest;
import com.burak.belediyeapp.dto.request.user.UpdateProfileRequest;
import com.burak.belediyeapp.dto.request.user.UpdateUserRolesRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.user.UserResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.user.UserService;
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
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Kullanıcılar", description = "Kullanıcı profil ve yönetimi")
public class UserController {

    private final UserService userService;

    // =====================================================
    //  Kendi Profili — tüm oturum açmış kullanıcılar
    // =====================================================

    @GetMapping("/me")
    @Operation(summary = "Giriş yapmış kullanıcı bilgilerini getir")
    public ResponseEntity<ApiResponse<UserResponse>> getMyProfile(
            @AuthenticationPrincipal AppUser currentUser) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserProfile(currentUser)));
    }

    @PatchMapping("/me")
    @Operation(summary = "Kendi profilini güncelle (ad, soyad, telefon)")
    public ResponseEntity<ApiResponse<UserResponse>> updateMyProfile(
            @AuthenticationPrincipal AppUser currentUser,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse response = userService.updateProfile(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Profil güncellendi", response));
    }

    @PostMapping("/me/change-password")
    @Operation(summary = "Kendi şifresini değiştir")
    public ResponseEntity<ApiResponse<Void>> changeMyPassword(
            @AuthenticationPrincipal AppUser currentUser,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Şifre başarıyla değiştirildi", null));
    }

    @PatchMapping("/me/preferred-municipality")
    @PreAuthorize("hasAuthority('ROLE_CITIZEN')")
    @Operation(summary = "Ana ekran widget'ları için tercih edilen belediye")
    public ResponseEntity<ApiResponse<UserResponse>> updatePreferredMunicipality(
            @AuthenticationPrincipal AppUser currentUser,
            @RequestBody java.util.Map<String, String> body) {
        String municipalityId = body.get("municipalityId");
        if (municipalityId == null || municipalityId.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("municipalityId zorunludur", "MISSING_MUNICIPALITY_ID"));
        }
        return ResponseEntity.ok(ApiResponse.success(
                userService.updatePreferredMunicipality(currentUser, municipalityId.trim())));
    }

    @PatchMapping("/fcm-token")
    @Operation(summary = "FCM Token güncelle")
    public ResponseEntity<ApiResponse<Void>> updateFcmToken(
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal AppUser currentUser) {
        String token = body.getOrDefault("fcmToken", body.get("token"));
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("FCM token gerekli", "MISSING_TOKEN"));
        }
        userService.updateFcmToken(currentUser.getId(), token);
        return ResponseEntity.ok(ApiResponse.success("FCM Token güncellendi", null));
    }

    // =====================================================
    //  Yönetici İşlemleri — Admin & üzeri
    // =====================================================

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_DEPT_MANAGER')")
    @Operation(summary = "Tüm kullanıcıları listele (Admin/Yönetici)")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers(
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(required = false) String role) {
        if (role != null && !role.isBlank()) {
            return ResponseEntity.ok(ApiResponse.success(userService.getUsersByRole(role, currentUser)));
        }
        return ResponseEntity.ok(ApiResponse.success(userService.getAllUsers(currentUser)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Yeni personel oluştur (Admin)")
    public ResponseEntity<ApiResponse<UserResponse>> createStaff(
            @Valid @RequestBody CreateStaffRequest request,
            @AuthenticationPrincipal AppUser currentUser) {
        UserResponse response = userService.createStaff(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Personel oluşturuldu", response));
    }

    @PatchMapping("/{userId}/roles")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Kullanıcı rollerini güncelle (Admin)")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserRoles(
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserRolesRequest request,
            @AuthenticationPrincipal AppUser currentUser) {
        UserResponse response = userService.updateUserRoles(userId, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Roller güncellendi", response));
    }

    @PatchMapping("/{userId}/toggle-enabled")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Kullanıcı hesabını aktif/pasif yap (Admin)")
    public ResponseEntity<ApiResponse<UserResponse>> toggleUserEnabled(
            @PathVariable String userId,
            @AuthenticationPrincipal AppUser currentUser) {
        UserResponse response = userService.toggleUserEnabled(userId, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Kullanıcı durumu güncellendi", response));
    }
}

