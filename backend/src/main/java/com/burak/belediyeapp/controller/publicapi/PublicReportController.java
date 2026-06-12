package com.burak.belediyeapp.controller.publicapi;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.report.PublicReportTrackingDto;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportHistory;
import com.burak.belediyeapp.entity.ReportMedia;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IReportHistoryRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/v1/public/reports")
@RequiredArgsConstructor
@Tag(name = "Public — Rapor Sorgulama", description = "Vatandaşların takip numarası ile ihbar durumunu sorgulaması")
public class PublicReportController {

    private final IReportRepository reportRepository;
    private final IReportHistoryRepository historyRepository;
    private final MediaSignedUrlService mediaSignedUrlService;

    @GetMapping("/track/{trackingNumber}")
    @Operation(summary = "Takip numarası ile ihbar sorgula")
    public ResponseEntity<ApiResponse<PublicReportTrackingDto>> trackReport(@PathVariable String trackingNumber) {
        Report report = reportRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException("İhbar", "trackingNumber", trackingNumber));

        // En son girilen notu bul
        List<ReportHistory> history = historyRepository.findTimelineByReportId(report.getId());
        String resolutionNote = history.stream()
                .filter(h -> h.getNote() != null && !h.getNote().isBlank())
                .max(Comparator.comparing(ReportHistory::getCreatedAt))
                .map(ReportHistory::getNote)
                .orElse(null);

        List<String> rawMediaUrls = report.getMediaList().stream()
                .filter(m -> !m.isResolvedImage())
                .map(ReportMedia::getImageUrl)
                .toList();

        List<String> rawResolvedMediaUrls = report.getMediaList().stream()
                .filter(ReportMedia::isResolvedImage)
                .map(ReportMedia::getImageUrl)
                .toList();

        List<String> mediaUrls = mediaSignedUrlService.signAll(rawMediaUrls);
        List<String> resolvedMediaUrls = mediaSignedUrlService.signAll(rawResolvedMediaUrls);

        PublicReportTrackingDto dto = new PublicReportTrackingDto(
                report.getTrackingNumber(),
                report.getTitle(),
                report.getReportStatus().name(),
                report.getCategory() != null ? report.getCategory().getName() : "Diğer",
                report.getMunicipality() != null ? report.getMunicipality().getName() : "Bilinmeyen Belediye",
                report.getCreatedAt(),
                report.getDistrict(),
                mediaUrls,
                resolvedMediaUrls,
                resolutionNote
        );

        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
