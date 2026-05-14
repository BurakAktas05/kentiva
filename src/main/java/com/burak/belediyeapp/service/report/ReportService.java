package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.request.report.AssignReportRequest;
import com.burak.belediyeapp.dto.request.report.CreateReportRequest;
import com.burak.belediyeapp.dto.request.report.UpdateReportStatusRequest;
import com.burak.belediyeapp.dto.response.report.ReportListResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.dto.response.report.ReportTimelineEntryResponse;
import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IReportHistoryRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.geo.DistrictResolutionService;
import com.burak.belediyeapp.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Rapor iş mantığı servisi.
 * Her metodun kimin çağırabileceği @PreAuthorize ile tanımlanmıştır.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final IReportRepository reportRepository;
    private final IReportCategoryRepository categoryRepository;
    private final IAppUserRepository userRepository;
    private final IReportHistoryRepository historyRepository;
    private final IReportMapper reportMapper;
    private final NotificationService notificationService;
    private final com.burak.belediyeapp.service.ai.GeminiService geminiService;
    private final DistrictResolutionService districtResolutionService;
    private final com.burak.belediyeapp.repository.IMunicipalityRepository municipalityRepository;
    private final ApplicationEventPublisher eventPublisher;

    // ===================================================
    // VATANDAŞ: Rapor Oluşturma
    // ===================================================

    @Transactional
    @PreAuthorize("hasAuthority('ROLE_CITIZEN')")
    @com.burak.belediyeapp.audit.AuditAction(action = "REPORT_CREATE", description = "Yeni bir vatandaş raporu oluşturuldu")
    public ReportResponse createReport(CreateReportRequest request, AppUser reporter) {
        ReportCategory category = categoryRepository.findById(request.categoryId())
                .filter(ReportCategory::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Kategori", "id", request.categoryId()));

        Report report = reportMapper.toEntity(request);
        report.setCategory(category);
        report.setReporter(reporter);

        Optional<String> spatialMunicipalityId = districtResolutionService.resolveDistrict(
                request.latitude(), request.longitude());

        if (reporter.getMunicipality() != null) {
            // Beyaz etiket / personel hesabı: hesaba bağlı belediye kullanılır.
            report.setMunicipality(reporter.getMunicipality());
            report.setDistrict(reporter.getMunicipality().getName());
        } else {
            // Kentiva: hesapta belediye yoksa seçilen hedef belediye + GPS eşleşmesi zorunlu.
            String targetId = request.targetMunicipalityId();
            if (targetId == null || targetId.isBlank()) {
                throw new BusinessException(
                        "Lütfen uygulamada bir belediye seçin veya konum iznini açın.",
                        "TARGET_MUNICIPALITY_REQUIRED");
            }
            if (spatialMunicipalityId.isEmpty() || !spatialMunicipalityId.get().equals(targetId)) {
                throw new BusinessException(
                        "Konum, seçtiğiniz belediye sınırlarıyla eşleşmiyor. Konumu yenileyin veya belediyeyi değiştirin.",
                        "LOCATION_MUNICIPALITY_MISMATCH");
            }
            Municipality target = municipalityRepository.findById(targetId)
                    .orElseThrow(() -> new BusinessException("Geçersiz belediye seçimi.", "MUNICIPALITY_NOT_FOUND"));
            if (!target.isActive() || !target.isOnboarded()) {
                throw new BusinessException("Seçilen belediye bu platformda aktif değil.", "MUNICIPALITY_NOT_AVAILABLE");
            }
            report.setMunicipality(target);
            String districtLabel = target.getDisplayName() != null && !target.getDisplayName().isBlank()
                    ? target.getDisplayName()
                    : target.getName();
            report.setDistrict(districtLabel);
        }

        Report saved = reportRepository.save(report);

        if (request.mediaUrls() != null && !request.mediaUrls().isEmpty()) {
            List<ReportMedia> mediaList = request.mediaUrls().stream()
                    .map(url -> ReportMedia.builder()
                            .imageUrl(url)
                            .report(saved)
                            .build())
                    .toList();
            saved.getMediaList().addAll(mediaList);
            reportRepository.save(saved);
        }

        historyRepository.save(ReportHistory.builder()
                .report(saved)
                .oldStatus(null)
                .newStatus(ReportStatus.PENDING)
                .changedBy(reporter)
                .note("İhbar oluşturuldu · ilçe: " + report.getDistrict())
                .build());

        eventPublisher.publishEvent(new ReportCreatedEvent(saved.getId()));

        log.info("Yeni rapor oluşturuldu: {} — {} — ilçe={}", saved.getId(), reporter.getEmail(), report.getDistrict());

        return reportMapper.toResponse(findReportOrThrow(saved.getId()));
    }

    // ===================================================
    // VATANDAŞ: Kendi Raporlarını Görüntüleme
    // ===================================================

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_CITIZEN')")
    public Page<ReportListResponse> getMyReports(AppUser user, Pageable pageable) {
        return reportRepository.findByReporterId(user.getId(), pageable)
                .map(reportMapper::toListResponse);
    }

    // ===================================================
    // SAHA EKİBİ / YÖNETİM: Rapor Listeleme
    // ===================================================

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public Page<ReportListResponse> getAllReports(AppUser user, Pageable pageable) {
        if (isSuperAdmin(user)) {
            return reportRepository.findAll(pageable)
                    .map(reportMapper::toListResponse);
        }
        if (user.getMunicipality() != null) {
            return reportRepository.findByMunicipalityId(user.getMunicipality().getId(), pageable)
                    .map(reportMapper::toListResponse);
        }
        return Page.empty(pageable);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public Page<ReportListResponse> getReportsByStatus(ReportStatus status, AppUser user, Pageable pageable) {
        if (isSuperAdmin(user)) {
            return reportRepository.findByReportStatus(status, pageable)
                    .map(reportMapper::toListResponse);
        }
        if (user.getMunicipality() != null) {
            return reportRepository.findByMunicipalityIdAndReportStatus(user.getMunicipality().getId(), status, pageable)
                    .map(reportMapper::toListResponse);
        }
        return Page.empty(pageable);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public Page<ReportListResponse> getReportsByDepartment(String departmentId, AppUser user, Pageable pageable) {
        if (!isSuperAdmin(user) && user.getMunicipality() != null) {
            return reportRepository.findByCategoryDepartmentIdAndMunicipalityId(
                            departmentId, user.getMunicipality().getId(), pageable)
                    .map(reportMapper::toListResponse);
        }
        if (!isSuperAdmin(user)) {
            return Page.empty(pageable);
        }
        return reportRepository.findByCategoryDepartmentId(departmentId, pageable)
                .map(reportMapper::toListResponse);
    }

    // ===================================================
    // RAPOR DETAYI
    // ===================================================

    @Transactional(readOnly = true)
    public ReportResponse getReportById(String reportId, AppUser currentUser) {
        Report report = findReportOrThrow(reportId);
        ensureCanViewReport(report, currentUser);
        return reportMapper.toResponse(report);
    }

    @Transactional(readOnly = true)
    public List<ReportTimelineEntryResponse> getReportTimeline(String reportId, AppUser currentUser) {
        Report report = findReportOrThrow(reportId);
        ensureCanViewReport(report, currentUser);
        return historyRepository.findTimelineByReportId(reportId).stream()
                .map(h -> new ReportTimelineEntryResponse(
                        h.getCreatedAt(),
                        h.getOldStatus() != null ? h.getOldStatus().name() : null,
                        h.getNewStatus() != null ? h.getNewStatus().name() : null,
                        h.getChangedBy() != null
                                ? h.getChangedBy().getFirstName() + " " + h.getChangedBy().getLastName()
                                : "Sistem",
                        h.getNote()))
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_FIELD_OFFICER')")
    public Page<ReportListResponse> getMyAssignments(AppUser user, Pageable pageable) {
        if (user.getMunicipality() != null) {
            return reportRepository.findByAssigneeIdAndMunicipalityId(user.getId(), user.getMunicipality().getId(), pageable)
                    .map(reportMapper::toListResponse);
        }
        return reportRepository.findByAssigneeId(user.getId(), pageable)
                .map(reportMapper::toListResponse);
    }

    // ===================================================
    // SAHA EKİBİ / YÖNETİM: Durum Güncelleme
    // ===================================================

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER', 'ROLE_DEPT_MANAGER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    @com.burak.belediyeapp.audit.AuditAction(action = "REPORT_STATUS_UPDATE", description = "Rapor durumu güncellendi")
    public ReportResponse updateReportStatus(String reportId, UpdateReportStatusRequest request, AppUser currentUser) {
        Report report = findReportOrThrow(reportId);
        ensureCanViewReport(report, currentUser);

        // İş kuralı: RESOLVED ve REJECTED raporlar tekrar güncellenemez
        if (report.getReportStatus() == ReportStatus.RESOLVED
                || report.getReportStatus() == ReportStatus.REJECTED) {
            throw new BusinessException(
                    "Kapatılmış bir raporun durumu değiştirilemez",
                    "REPORT_ALREADY_CLOSED");
        }

        ReportStatus oldStatus = report.getReportStatus();
        report.setReportStatus(request.status());

        // Tarihçe kaydı
        ReportHistory history = ReportHistory.builder()
                .report(report)
                .oldStatus(oldStatus)
                .newStatus(request.status())
                .changedBy(currentUser)
                .note(request.note())
                .build();
        historyRepository.save(history);

        Report saved = reportRepository.save(report);

        // Vatandaşa bildirim gönder
        notificationService.notifyReportStatusChanged(saved);

        log.info("Rapor durumu güncellendi: {} — {} → {}", reportId, oldStatus, request.status());
        return reportMapper.toResponse(saved);
    }

    // ===================================================
    // BİRİM MÜDÜRÜ: Saha Ekibi Atama
    // ===================================================

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public ReportResponse assignReport(String reportId, AssignReportRequest request, AppUser assignedBy) {
        Report report = findReportOrThrow(reportId);
        ensureCanViewReport(report, assignedBy);

        AppUser assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", request.assigneeId()));
        ensureSameMunicipality(report, assignee);

        // İş kuralı: sadece saha görevlisi atanabilir
        if (!assignee.hasRole("ROLE_FIELD_OFFICER")) {
            throw new BusinessException(
                    "Yalnızca saha görevlisi olan kullanıcılar atanabilir",
                    "INVALID_ASSIGNEE_ROLE");
        }

        report.setAssignee(assignee);

        // Rapor PENDING'den PROCESSING'e geçer
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

        // Saha görevlisine bildirim gönder
        notificationService.notifyReportAssigned(saved, assignee);

        log.info("Rapor atandı: {} → {}", reportId, assignee.getEmail());
        return reportMapper.toResponse(saved);
    }

    // ===================================================
    // COĞRAFİ SORGU: Yakın Raporlar (Saha Ekibi)
    // ===================================================

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_FIELD_OFFICER','ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public List<ReportListResponse> getNearbyReports(double latitude, double longitude, double radiusMeters, AppUser currentUser) {
        List<Report> reports;
        if (isSuperAdmin(currentUser)) {
            reports = reportRepository.findNearbyReports(latitude, longitude, radiusMeters);
        } else if (currentUser.getMunicipality() != null) {
            reports = reportRepository.findNearbyReportsByMunicipality(
                    latitude, longitude, radiusMeters, currentUser.getMunicipality().getId());
        } else {
            throw new BusinessException("Bu işlem için belediye kapsamı gerekli", "MUNICIPALITY_REQUIRED");
        }

        return reports
                .stream()
                .map(reportMapper::toListResponse)
                .toList();
    }

    // ===================================================
    // Yardımcı Metodlar
    // ===================================================

    @Transactional
    public void performAiAnalysis(String reportId) {
        Report report = findReportOrThrow(reportId);
        com.burak.belediyeapp.service.ai.GeminiService.AIAnalysisResult result = geminiService.analyzeReport(report);

        if (result != null) {
            report.setAiPriority(result.priority());
            report.setAiSummary(composeSummaryWithRationale(result.summary(), result.priorityRationale()));
            report.setAiSlaRisk(blankToNull(truncate(result.slaRisk(), 20)));
            report.setAiReplyDraft(blankToNull(result.replyDraft()));
            report.setAiDuplicateHint(blankToNull(truncate(result.duplicateHint(), 500)));

            // Başlık önerisi varsa güncelle
            if (result.suggestedTitle() != null && !result.suggestedTitle().isBlank()) {
                report.setTitle(result.suggestedTitle());
            }

            // Kategori önerisi varsa ve mevcut kategori "Diğer" ise veya AI kesin ise güncelle
            if (result.suggestedCategoryName() != null && !result.suggestedCategoryName().isBlank()) {
                report.setAiSuggestedCategory(result.suggestedCategoryName());
                
                // Eğer mevcut kategori "Diğer" ise veya AI kategorinin yanlış olduğunu söylüyorsa otomatik düzelt
                if (!result.isCategoryCorrect() || report.getCategory().getName().equals("Diğer")) {
                    categoryRepository.findByName(result.suggestedCategoryName())
                            .ifPresent(newCat -> {
                                report.setCategory(newCat);
                                log.info("AI otomatik kategori düzeltti: {} -> {}", reportId, newCat.getName());
                            });
                }
            }

            reportRepository.save(report);
            log.info("AI analizi tamamlandı: rapor={}, öncelik={}, başlık={}", 
                    reportId, result.priority(), report.getTitle());
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

    private Report findReportOrThrow(String reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Rapor", "id", reportId));
    }

    /**
     * Object-level authorization merkezi burada tutulur.
     * URL güvenliği rolü doğrular; bu kontrol ise kullanıcının doğru belediye verisine eriştiğini garanti eder.
     */
    private void ensureCanViewReport(Report report, AppUser user) {
        if (isSuperAdmin(user)) {
            return;
        }

        if (isCitizenOnly(user)) {
            if (report.getReporter() != null && report.getReporter().getId().equals(user.getId())) {
                return;
            }
            throw new BusinessException("Bu rapora erişim yetkiniz yok", "ACCESS_DENIED");
        }

        if (user.getMunicipality() == null
                || report.getMunicipality() == null
                || !report.getMunicipality().getId().equals(user.getMunicipality().getId())) {
            throw new BusinessException("Bu rapora erişim yetkiniz yok", "CROSS_MUNICIPALITY_ACCESS");
        }
    }

    private void ensureSameMunicipality(Report report, AppUser assignee) {
        if (report.getMunicipality() == null
                || assignee.getMunicipality() == null
                || !report.getMunicipality().getId().equals(assignee.getMunicipality().getId())) {
            throw new BusinessException("Rapor yalnızca aynı belediyedeki saha görevlisine atanabilir", "CROSS_MUNICIPALITY_ASSIGNMENT");
        }
    }

    private boolean isSuperAdmin(AppUser user) {
        return user.hasRole("ROLE_SUPER_ADMIN");
    }

    private boolean isCitizenOnly(AppUser user) {
        return user.hasRole("ROLE_CITIZEN")
                && !user.hasRole("ROLE_FIELD_OFFICER")
                && !user.hasRole("ROLE_DEPT_MANAGER")
                && !user.hasRole("ROLE_ADMIN")
                && !user.hasRole("ROLE_SUPER_ADMIN");
    }
}
