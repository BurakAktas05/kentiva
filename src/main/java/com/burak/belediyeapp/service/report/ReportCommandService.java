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
import com.burak.belediyeapp.service.citizen.CitizenReputationService;
import com.burak.belediyeapp.service.integration.WebhookDispatchService;
import com.burak.belediyeapp.service.notification.NotificationService;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
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
    private final CitizenReputationService citizenReputationService;

    /**
     * Spring proxy SELF-CALL'ları yakalamadığı için iç @Transactional metotlarını
     * proxy üzerinden çağırmak için kendine @Lazy referans tutarız.
     */
    @Autowired
    @Lazy
    private ReportCommandService self;

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

        // Beyaz Masa görevlileri ihbarları çözüldü yapamaz; bu işlem yalnızca ilgili departman tarafından gerçekleştirilebilir.
        if (request.status() == ReportStatus.RESOLVED && currentUser.getDepartment() == null) {
            throw new BusinessException(
                    "Beyaz masa görevlileri ihbarları çözüldü yapamaz; bu işlem yalnızca ilgili departman tarafından gerçekleştirilebilir.",
                    "RESOLVE_FORBIDDEN_FOR_WHITE_TABLE");
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
        if (request.status() == ReportStatus.RESOLVED) {
            citizenReputationService.onReportResolved(saved);
        } else if (request.status() == ReportStatus.REJECTED) {
            citizenReputationService.onReportRejected(saved, false);
        }
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
            citizenReputationService.onReportRejected(
                    report, CitizenReputationService.isSelfieReason(reason));
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

    /**
     * Bulk endpoint — DELIBERATELY non-transactional.
     * Her item kendi REQUIRED txn'inde işlenir (assignReport/updateReportStatus zaten @Transactional);
     * tek bir başarısızlık tüm grubu rollback'e SÜRÜKLEMEZ ve uzun txn'ler DB connection'larını
     * tutmaz (audit gereğince hata satır bazlı raporlanır).
     */
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

    /**
     * Adminin / saha ekibinin elle tetiklediği AI analizi — IDOR korumalı.
     * Çağıran kullanıcı raporun belediye kapsamında değilse erişim reddedilir.
     * Gemini HTTP çağrısı transaction DIŞINDA yapılır (DB connection bekletilmez).
     */
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public void performAiAnalysis(String reportId, AppUser currentUser) {
        // self üzerinden çağırarak @Transactional proxy'sini garanti altına alırız.
        AiContext ctx = self.loadReportWithTenantCheck(reportId, currentUser);
        applyAiAnalysisOutsideTx(reportId, ctx);
    }

    /**
     * Sistem (event listener) tarafından tetiklenen AI analizi.
     * Hiçbir kullanıcı yok — IDOR kontrolüne tabi değildir, ama kategori değiştirme
     * yine de raporun belediye kapsamına bağlanır.
     */
    public void performAiAnalysisAsSystem(String reportId) {
        AiContext ctx = self.loadReportForSystemAi(reportId);
        applyAiAnalysisOutsideTx(reportId, ctx);
    }

    /**
     * AI analizi için hot-path snapshot. Detached entity LAZY proxy'lerine erişimden
     * kaçınmak için Gemini/Heuristic'in ihtiyacı olan alanları önceden okur.
     */
    public record AiContext(Report report, String municipalityId) {}

    @Transactional(readOnly = true)
    public AiContext loadReportWithTenantCheck(String reportId, AppUser currentUser) {
        Report report = reportRepository.findByIdForRealtimePush(reportId)
                .orElseThrow(() -> new com.burak.belediyeapp.exception.ResourceNotFoundException(
                        "Rapor", "id", reportId));
        tenantAccess.ensureCanViewReport(report, currentUser);
        // LAZY alanları henüz session açıkken zorla initialize et:
        String muniId = report.getMunicipality() != null ? report.getMunicipality().getId() : null;
        if (report.getCategory() != null) report.getCategory().getName();
        return new AiContext(report, muniId);
    }

    @Transactional(readOnly = true)
    public AiContext loadReportForSystemAi(String reportId) {
        Report report = reportRepository.findByIdForRealtimePush(reportId)
                .orElseThrow(() -> new com.burak.belediyeapp.exception.ResourceNotFoundException(
                        "Rapor", "id", reportId));
        String muniId = report.getMunicipality() != null ? report.getMunicipality().getId() : null;
        if (report.getCategory() != null) report.getCategory().getName();
        return new AiContext(report, muniId);
    }

    /** Gemini/HTTP çağrısı txn dışında. Sonra kısa yazma txn'i ile kaydeder. */
    private void applyAiAnalysisOutsideTx(String reportId, AiContext ctx) {
        Report report = ctx.report();
        GeminiService.AIAnalysisResult result = geminiService.analyzeReport(report);
        if (result == null) {
            result = heuristicReportAnalyzer.analyze(report);
            log.info("Kural tabanlı AI yedek analiz kullanıldı: {}", reportId);
        }
        if (result == null) {
            return;
        }
        self.persistAiResult(reportId, ctx.municipalityId(), result);
    }

    @Transactional
    public void persistAiResult(String reportId, String municipalityId, GeminiService.AIAnalysisResult result) {
        Report report = reportSupport.findReportOrThrow(reportId);
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

            boolean shouldReassign = !result.isCategoryCorrect()
                    || (report.getCategory() != null && "Diğer".equals(report.getCategory().getName()));
            if (shouldReassign) {
                // Cross-tenant kategori atamasını önlemek için belediye kapsamında ara.
                categoryRepository.findVisibleToMunicipalityByName(
                                result.suggestedCategoryName(), municipalityId)
                        .stream()
                        .findFirst()
                        .ifPresent(newCat -> {
                            report.setCategory(newCat);
                            log.info("AI otomatik kategori düzeltti (tenant-scoped): {} -> {}",
                                    reportId, newCat.getName());
                        });
            }
        }
        reportRepository.save(report);
        log.info("AI analizi tamamlandı: rapor={}, öncelik={}", reportId, result.priority());
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
