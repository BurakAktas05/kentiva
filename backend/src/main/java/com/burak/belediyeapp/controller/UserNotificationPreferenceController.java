package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.UserNotificationPreference;
import com.burak.belediyeapp.repository.IUserNotificationPreferenceRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Kullanıcı Bildirim Tercihleri", description = "Vatandaşların mobil uygulamadaki bildirim tercihlerinin yönetimi")
public class UserNotificationPreferenceController {

    private final IUserNotificationPreferenceRepository preferenceRepository;

    public record NotificationPreferenceResponse(
            String id,
            boolean announcementsEnabled,
            boolean outagesEnabled,
            boolean surveysEnabled
    ) {}

    public record UpdateNotificationPreferenceRequest(
            boolean announcementsEnabled,
            boolean outagesEnabled,
            boolean surveysEnabled
    ) {}

    private NotificationPreferenceResponse mapToResponse(UserNotificationPreference pref) {
        return new NotificationPreferenceResponse(
                pref.getId(),
                pref.isAnnouncementsEnabled(),
                pref.isOutagesEnabled(),
                pref.isSurveysEnabled()
        );
    }

    @GetMapping("/api/v1/users/me/notification-preferences")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Kullanıcının bildirim tercihlerini getir")
    public ResponseEntity<ApiResponse<NotificationPreferenceResponse>> getPreferences(
            @AuthenticationPrincipal AppUser user) {

        UserNotificationPreference pref = preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserNotificationPreference newPref = UserNotificationPreference.builder()
                            .user(user)
                            .announcementsEnabled(true)
                            .outagesEnabled(true)
                            .surveysEnabled(true)
                            .build();
                    return preferenceRepository.save(newPref);
                });

        return ResponseEntity.ok(ApiResponse.success(mapToResponse(pref)));
    }

    @PutMapping("/api/v1/users/me/notification-preferences")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Kullanıcının bildirim tercihlerini güncelle")
    public ResponseEntity<ApiResponse<NotificationPreferenceResponse>> updatePreferences(
            @AuthenticationPrincipal AppUser user,
            @RequestBody UpdateNotificationPreferenceRequest request) {

        UserNotificationPreference pref = preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> UserNotificationPreference.builder().user(user).build());

        pref.setAnnouncementsEnabled(request.announcementsEnabled());
        pref.setOutagesEnabled(request.outagesEnabled());
        pref.setSurveysEnabled(request.surveysEnabled());

        UserNotificationPreference saved = preferenceRepository.save(pref);
        return ResponseEntity.ok(ApiResponse.success("Bildirim tercihleri güncellendi", mapToResponse(saved)));
    }
}
