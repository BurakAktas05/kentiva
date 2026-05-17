package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.request.report.AssignReportRequest;
import com.burak.belediyeapp.dto.request.report.BulkAssignReportsRequest;
import com.burak.belediyeapp.dto.request.report.BulkUpdateReportStatusRequest;
import com.burak.belediyeapp.dto.request.report.UpdateReportStatusRequest;
import com.burak.belediyeapp.dto.response.report.BulkReportOperationResult;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IReportHistoryRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.ai.GeminiService;
import com.burak.belediyeapp.service.ai.HeuristicReportAnalyzer;
import com.burak.belediyeapp.service.integration.WebhookDispatchService;
import com.burak.belediyeapp.service.notification.NotificationService;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportCommandService {

    private final IReportRepository reportRepository;
    private final IReportCategoryRepository categoryRepository;
    private final IAppUserRepository userRepository;
    private final IReportHistoryRepository historyRepository;
    private final IReportMapper reportMapper;
    private final ReportSupport reportSupport;
    private final TenantAccessService tenantAccess;
    private final NotificationService notificationService;
    private final GeminiService geminiService;
    private final HeuristicReportAnalyzer heuristicReportAnalyzer;
    private final WebhookDispatchService webhookDispatchService;

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER', 'ROLE_DEPT_MANAGER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    @com.burak.belediyeapp.audit.AuditAction(action = "REPORT_STATUS_UPDATE", description = "Rapor durumu güncellendi")
    public ReportResponse updateReportStatus(String reportId, UpdateReportStatusRequest request, AppUser currentUser) {
        Report report = reportSupport.findReportOrThrow(reportId);
        tenantAccess.ensureCanViewReport(report, currentUser);

        if (report.getReportStatus() == ReportStatus.RESOLVED
                || report.getReportStatus() == ReportStatus.REJECTED) {
            throw new BusinessException(
                    "Kapatılmış bir raporun durumu değiştirilemez",
                    "REPORT_ALREADY_CLOSED");
        }

        // Sadece SUPER_ADMIN rapor reddedebilir; belediye adminleri reddedemez
        if (request.status() == ReportStatus.REJECTED
                && !currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            throw new BusinessException(
                    "Rapor reddi yalnızca platform yöneticisi tarafından yapılabilir.",
                    "REJECT_FORBIDDEN");
        }

        ReportStatus oldStatus = report.getReportStatus();
        report.setReportStatus(request.status());

        historyRepository.save(ReportHistory.builder()
                .report(report)
                .oldStatus(oldStatus)
                .newStatus(request.status())
                .changedBy(currentUser)
                .note(request.note())
                .build());

        Report saved = reportRepository.save(report);
        notificationService.notifyReportStatusChanged(saved);

        if (saved.getMunicipality() != null) {
            webhookDispatchService.dispatchReportStatusChanged(
                    saved.getMunicipality(), saved, oldStatus, request.status(), request.note());
        }

        log.info("Rapor durumu güncellendi: {} — {} → {}", reportId, oldStatus, request.status());
        return reportSupport.finalizeResponse(saved, reportMapper.toResponse(saved));
    }

    /**
     * Sistem tarafından otomatik red — YALNIZCA media-guard async pipeline çağırır.
     * Human kullanıcıların erişemeyeceği internal metot; @PreAuthorize YOK.
     * Rapor zaten PENDING/PROCESSING değilse sessizce atlanır.
     */
    @Transactional
    public void systemRejectReport(String reportId, String reason) {
        reportRepository.findById(reportId).ifPresent(report -> {
            if (report.getReportStatus() == ReportStatus.RESOLVED
                    || report.getReportStatus() == ReportStatus.REJECTED) {
                log.info("Sistem reddi atlandı — rapor zaten kapalı: {}", reportId);
                return;
            }
            ReportStatus oldStatus = report.getReportStatus();
            report.setReportStatus(ReportStatus.REJECTED);
            historyRepository.save(ReportHistory.builder()
                    .report(report)
                    .oldStatus(oldStatus)
                    .newStatus(ReportStatus.REJECTED)
                    .changedBy(null)   // sistem eylemi
                    .note("[SİSTEM] Otomatik red — " + reason)
                    .build());
            reportRepository.save(report);
            // Vatandaşı bilgilendirme: REJECTED notification gönder
            try {
                notificationService.notifyReportStatusChanged(report);
            } catch (Exception ex) {
                log.warn("Sistem reddi bildirimi gönderilemedi: {}", ex.getMessage());
            }
            log.warn("Rapor sistem tarafından reddedildi: {} — sebep: {}", reportId, reason);
        });
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public ReportResponse assignReport(String reportId, AssignReportRequest request, AppUser assignedBy) {
        Report report = reportSupport.findReportOrThrow(reportId);
        tenantAccess.ensureCanViewReport(report, assignedBy);

        if (report.getMunicipality() == null) {
            throw new BusinessException("Rapor belediye kapsamı olmadan atanamaz.", "MUNICIPALITY_REQUIRED");
        }
        String municipalityId = report.getMunicipality().getId();
        AppUser assignee = userRepository.findByIdAndMunicipalityId(request.assigneeId(), municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", request.assigneeId()));

        if (!assignee.hasRole("ROLE_FIELD_OFFICER")) {
            throw new BusinessException(
                    "Yalnızca saha görevlisi olan kullanıcılar atanabilir",
                    "INVALID_ASSIGNEE_ROLE");
        }

        report.setAssignee(assignee);

        if (report.getReportStatus() == ReportStatus.PENDING) {
            ReportStatus oldStatus = report.getReportStatus();
            report.setReportStatus(ReportStatus.PROCESSING);

            historyRepository.save(ReportHistory.builder()
                    .report(report)
                    .oldStatus(oldStatus)
                    .newStatus(ReportStatus.PROCESSING)
                    .changedBy(assignedBy)
                    .note("Saha görevlisi atandı: " + assignee.getFullName())
                    .build());
        }

        Report saved = reportRepository.save(report);
        notificationService.notifyReportAssigned(saved, assignee);

        if (saved.getMunicipality() != null) {
            webhookDispatchService.dispatchReportAssigned(
                    saved.getMunicipality(), saved, assignee.getId());
        }

        if (saved.getReportStatus() == ReportStatus.PROCESSING) {
            notificationService.notifyReportStatusChanged(saved);
        }

        log.info("Rapor atandı: {} → {}", reportId, assignee.getEmail());
        return reportSupport.finalizeResponse(saved, reportMapper.toResponse(saved));
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public BulkReportOperationResult bulkAssignReports(BulkAssignReportsRequest request, AppUser assignedBy) {
        List<String> ids = ReportSupport.distinctIds(request.reportIds());
        List<BulkReportOperationResult.BulkReportFailure> failures = new ArrayList<>();
        int success = 0;
        for (String reportId : ids) {
            try {
                assignReport(reportId, new AssignReportRequest(request.assigneeId()), assignedBy);
                success++;
            } catch (BusinessException | ResourceNotFoundException e) {
                failures.add(new BulkReportOperationResult.BulkReportFailure(reportId, e.getMessage()));
            }
        }
        return new BulkReportOperationResult(success, failures.size(), failures);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER', 'ROLE_DEPT_MANAGER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    @com.burak.belediyeapp.audit.AuditAction(action = "REPORT_STATUS_BULK_UPDATE", description = "Toplu rapor durumu güncellendi")
    public BulkReportOperationResult bulkUpdateReportStatus(
            BulkUpdateReportStatusRequest request, AppUser currentUser) {
        List<String> ids = ReportSupport.distinctIds(request.reportIds());
        List<BulkReportOperationResult.BulkReportFailure> failures = new ArrayList<>();
        int success = 0;
        UpdateReportStatusRequest single = new UpdateReportStatusRequest(request.status(), request.note());
        for (String reportId : ids) {
            try {
                updateReportStatus(reportId, single, currentUser);
                success++;
            } catch (BusinessException | ResourceNotFoundException e) {
                failures.add(new BulkReportOperationResult.BulkReportFailure(reportId, e.getMessage()));
            }
        }
        return new BulkReportOperationResult(success, failures.size(), failures);
    }

    @Transactional
    public void performAiAnalysis(String reportId) {
        Report report = reportSupport.findReportOrThrow(reportId);
        GeminiService.AIAnalysisResult result = geminiService.analyzeReport(report);
        if (result == null) {
            result = heuristicReportAnalyzer.analyze(report);
            log.info("Kural tabanlı AI yedek analiz kullanıldı: {}", reportId);
        }

        if (result != null) {
            report.setAiPriority(result.priority());
            report.setAiSummary(composeSummaryWithRationale(result.summary(), result.priorityRationale()));
            report.setAiSlaRisk(blankToNull(truncate(result.slaRisk(), 20)));
            report.setAiReplyDraft(blankToNull(result.replyDraft()));
            report.setAiDuplicateHint(blankToNull(truncate(result.duplicateHint(), 500)));

            if (result.suggestedTitle() != null && !result.suggestedTitle().isBlank()) {
                report.setTitle(result.suggestedTitle());
            }

            if (result.suggestedCategoryName() != null && !result.suggestedCategoryName().isBlank()) {
                report.setAiSuggestedCategory(result.suggestedCategoryName());

                if (!result.isCategoryCorrect() || report.getCategory().getName().equals("Diğer")) {
                    categoryRepository.findByName(result.suggestedCategoryName())
                            .ifPresent(newCat -> {
                                report.setCategory(newCat);
                                log.info("AI otomatik kategori düzeltti: {} -> {}", reportId, newCat.getName());
                            });
                }
            }

            reportRepository.save(report);
            log.info("AI analizi tamamlandı: rapor={}, öncelik={}", reportId, result.priority());
        }
    }

    private static String composeSummaryWithRationale(String summary, String rationale) {
        if (rationale == null || rationale.isBlank()) {
            return summary;
        }
        if (summary == null || summary.isBlank()) {
            return rationale;
        }
        return summary + " — " + rationale;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}
