package com.burak.belediyeapp.controller.publicapi;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.report.PublicReportTrackingDto;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.security.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Anonim takip sorgusu. Medya URL'leri ve iş akışı notları kasıtlı olarak
 * döndürülmez — bunlar yalnızca kimliği doğrulanmış vatandaş/personel
 * uç noktalarından alınmalıdır (KVKK / iç not sızıntısı önlemi).
 */
@RestController
@RequestMapping("/api/v1/public/reports")
@RequiredArgsConstructor
@Tag(name = "Public — Rapor Sorgulama", description = "Vatandaşların takip numarası ile ihbar durumunu sorgulaması")
public class PublicReportController {

    private final IReportRepository reportRepository;

    @GetMapping("/track/{trackingNumber}")
    @RateLimit(requests = 20, window = 60)
    @Operation(summary = "Takip numarası ile ihbar durumunu sorgula (medya ve iç notlar hariç)")
    public ResponseEntity<ApiResponse<PublicReportTrackingDto>> trackReport(@PathVariable String trackingNumber) {
        Report report = reportRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException("İhbar", "trackingNumber", trackingNumber));

        PublicReportTrackingDto dto = new PublicReportTrackingDto(
                report.getTrackingNumber(),
                report.getTitle(),
                report.getReportStatus().name(),
                report.getCategory() != null ? report.getCategory().getName() : "Diğer",
                report.getMunicipality() != null ? report.getMunicipality().getName() : "Bilinmeyen Belediye",
                report.getCreatedAt(),
                report.getDistrict(),
                List.of(),
                List.of(),
                null
        );

        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
