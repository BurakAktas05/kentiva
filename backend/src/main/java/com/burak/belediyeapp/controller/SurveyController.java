package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.survey.MunicipalitySurveyRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.survey.MunicipalitySurveyDetailDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.survey.MunicipalitySurveyService;
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
@RequiredArgsConstructor
@Tag(name = "Belediye Anketleri", description = "Anketlerin oylanması, listelenmesi ve yönetimi")
public class SurveyController {

    private final MunicipalitySurveyService surveyService;

    @GetMapping("/api/v1/public/municipalities/{municipalityId}/surveys")
    @Operation(summary = "Belediyenin aktif anketlerini listele (Vatandaş)")
    public ResponseEntity<ApiResponse<List<MunicipalitySurveyDetailDto>>> getPublicSurveys(
            @PathVariable String municipalityId,
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.listPublic(municipalityId, user)));
    }

    public record VoteRequest(int selectedOption) {}

    @PostMapping("/api/v1/public/surveys/{surveyId}/vote")
    @PreAuthorize("hasRole('CITIZEN')")
    @Operation(summary = "Ankete oy ver (+15 İtibar Puanı ödüllü)")
    public ResponseEntity<ApiResponse<MunicipalitySurveyDetailDto>> voteSurvey(
            @PathVariable String surveyId,
            @RequestBody VoteRequest request,
            @AuthenticationPrincipal AppUser user) {
        MunicipalitySurveyDetailDto response = surveyService.vote(surveyId, request.selectedOption(), user);
        return ResponseEntity.ok(ApiResponse.success(
                "Oyunuz başarıyla kaydedildi! +15 itibar puanı kazandınız.", response));
    }

    @GetMapping("/api/v1/municipalities/me/surveys")
    @PreAuthorize("hasAnyRole('ADMIN','DEPT_MANAGER')")
    @Operation(summary = "Kendi belediyesinin tüm anketlerini sonuçları ile listele (Yönetici)")
    public ResponseEntity<ApiResponse<List<MunicipalitySurveyDetailDto>>> getAdminSurveys(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.listForAdmin(user)));
    }

    @PostMapping("/api/v1/municipalities/me/surveys")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Yeni anket yayınla (Yönetici)")
    public ResponseEntity<ApiResponse<MunicipalitySurveyDetailDto>> createSurvey(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody MunicipalitySurveyRequest request) {
        MunicipalitySurveyDetailDto saved = surveyService.create(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Anket yayınlandı", saved));
    }

    @PutMapping("/api/v1/municipalities/me/surveys/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Anketi güncelle veya pasifleştir (Yönetici)")
    public ResponseEntity<ApiResponse<MunicipalitySurveyDetailDto>> updateSurvey(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id,
            @Valid @RequestBody MunicipalitySurveyRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Anket güncellendi", surveyService.update(user, id, request)));
    }

    @DeleteMapping("/api/v1/municipalities/me/surveys/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Anketi sil (Yönetici)")
    public ResponseEntity<ApiResponse<Void>> deleteSurvey(
            @AuthenticationPrincipal AppUser user,
            @PathVariable String id) {
        surveyService.delete(user, id);
        return ResponseEntity.ok(ApiResponse.success("Anket silindi", null));
    }

    @GetMapping("/api/v1/municipalities/me/surveys/analytics")
    @PreAuthorize("hasAnyRole('ADMIN','DEPT_MANAGER')")
    @Operation(summary = "Kategori bazlı anket katılım analizleri (Yönetici)")
    public ResponseEntity<ApiResponse<com.burak.belediyeapp.dto.response.survey.SurveyAnalyticsDto>> getAnalytics(
            @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getAnalytics(user)));
    }
}
