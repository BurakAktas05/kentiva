package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.notification.NotificationResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.service.notification.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Bildirimler", description = "Kullanıcı bildirimleri yönetimi")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Bildirimlerimi listele")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getMyNotifications(
            @AuthenticationPrincipal AppUser currentUser,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {

        Page<NotificationResponse> page = notificationService.getNotifications(currentUser.getId(), pageable)
                .map(this::mapToResponse);

        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Okunmamış bildirim sayısını getir")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal AppUser currentUser) {

        long count = notificationService.getUnreadCount(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PostMapping("/mark-all-read")
    @Operation(summary = "Tüm bildirimleri okundu işaretle")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal AppUser currentUser) {

        notificationService.markAllAsRead(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Tüm bildirimler okundu işaretlendi", null));
    }

    private NotificationResponse mapToResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getTitle(),
                n.getBody(),
                n.getType(),
                n.isRead(),
                n.getReportId(),
                n.getCreatedAt()
        );
    }
}
