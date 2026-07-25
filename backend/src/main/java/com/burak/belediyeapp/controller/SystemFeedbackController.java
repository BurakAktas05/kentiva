package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.feedback.SubmitFeedbackRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.feedback.SystemFeedbackResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.SystemFeedback;
import com.burak.belediyeapp.service.feedback.SystemFeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/v1/system-feedback")
@RequiredArgsConstructor
@Tag(name = "Sistem Geri Bildirimleri", description = "Mobil uygulama geri bildirim yönetimi")
public class SystemFeedbackController {

    private final SystemFeedbackService feedbackService;

    @PostMapping
    @Operation(summary = "Uygulama hakkında geri bildirim gönder (Citizen)")
    public ResponseEntity<ApiResponse<SystemFeedbackResponse>> submitFeedback(
            @AuthenticationPrincipal AppUser currentUser,
            @Valid @RequestBody SubmitFeedbackRequest request) {
        SystemFeedback feedback = feedbackService.submitFeedback(currentUser, request.getRating(), request.getContent());
        SystemFeedbackResponse response = mapToResponse(feedback);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Geri bildiriminiz başarıyla iletildi", response));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Tüm geri bildirimleri listele (Super Admin)")
    public ResponseEntity<ApiResponse<Page<SystemFeedbackResponse>>> listAllFeedback(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<SystemFeedbackResponse> page = feedbackService.listAllFeedback(pageable).map(this::mapToResponse);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/ai-report")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Geri bildirimlerin genel yapay zeka analiz raporunu getir (Super Admin)")
    public ResponseEntity<ApiResponse<String>> getAiAnalysisReport() {
        String report = feedbackService.getAiAnalysisReport();
        return ResponseEntity.ok(ApiResponse.success("Yapay zeka analiz raporu üretildi", report));
    }

    private SystemFeedbackResponse mapToResponse(SystemFeedback sf) {
        return SystemFeedbackResponse.builder()
                .id(sf.getId())
                .username(sf.getUser() != null ? sf.getUser().getFirstName() + " " + sf.getUser().getLastName() : "Anonim")
                .userEmail(sf.getUser() != null ? sf.getUser().getEmail() : "")
                .rating(sf.getRating())
                .content(sf.getContent())
                .sentiment(sf.getSentiment())
                .category(sf.getCategory())
                .createdAt(sf.getCreatedAt())
                .build();
    }
}
