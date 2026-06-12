package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.report.SubmitReportFeedbackRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportFeedback;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IReportFeedbackRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Rapor Memnuniyet Anketi", description = "Çözülen ihbarlar için vatandaş memnuniyet anketi işlemleri")
public class ReportFeedbackController {

    private final IReportRepository reportRepository;
    private final IReportFeedbackRepository feedbackRepository;

    @PostMapping("/{reportId}/feedback")
    @PreAuthorize("hasAuthority('ROLE_CITIZEN')")
    @Operation(summary = "Çözülen ihbar için memnuniyet anketi gönder")
    public ResponseEntity<ApiResponse<Void>> submitFeedback(
            @PathVariable String reportId,
            @AuthenticationPrincipal AppUser currentUser,
            @Valid @RequestBody SubmitReportFeedbackRequest request) {

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Rapor", "id", reportId));

        if (report.getReportStatus() != ReportStatus.RESOLVED) {
            throw new BusinessException(
                    "Yalnızca çözülmüş ihbarlar için değerlendirme yapılabilir.",
                    "REPORT_NOT_RESOLVED"
            );
        }

        if (report.getReporter() == null || !report.getReporter().getId().equals(currentUser.getId())) {
            throw new BusinessException(
                    "Bu ihbarı siz açmadığınız için değerlendiremezsiniz.",
                    "FEEDBACK_ACCESS_DENIED"
            );
        }

        if (feedbackRepository.existsByReportId(reportId)) {
            throw new BusinessException(
                    "Bu ihbar için zaten değerlendirme yapılmıştır.",
                    "FEEDBACK_ALREADY_SUBMITTED"
            );
        }

        ReportFeedback feedback = ReportFeedback.builder()
                .report(report)
                .rating(request.rating())
                .comment(request.comment())
                .build();

        feedbackRepository.save(feedback);

        return ResponseEntity.ok(ApiResponse.success("Değerlendirmeniz kaydedildi. Teşekkür ederiz.", null));
    }
}
