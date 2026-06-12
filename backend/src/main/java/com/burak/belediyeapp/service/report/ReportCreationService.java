package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.request.report.CreateReportRequest;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.config.CacheNames;
import com.burak.belediyeapp.service.admin.MembershipStatusResolver;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IReportHistoryRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.ai.ContentLanguageDetector;
import com.burak.belediyeapp.service.citizen.CitizenReputationService;
import com.burak.belediyeapp.service.integration.WebhookDispatchService;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportCreationService {

    private final IReportRepository reportRepository;
    private final IReportCategoryRepository categoryRepository;
    private final IReportHistoryRepository historyRepository;
    private final IReportMapper reportMapper;
    private final ReportSupport reportSupport;
    private final TenantAccessService tenantAccess;
    private final MediaSignedUrlService mediaSignedUrlService;
    private final ApplicationEventPublisher eventPublisher;
    private final ReportDuplicateLinkService duplicateLinkService;
    private final WebhookDispatchService webhookDispatchService;
    private final CitizenReputationService citizenReputationService;
    private final com.burak.belediyeapp.service.security.KvkkConsentSigningService kvkkConsentSigningService;
    private final com.burak.belediyeapp.repository.IAppUserRepository userRepository;


    @Transactional
    @PreAuthorize("hasAuthority('ROLE_CITIZEN')")
    @CacheEvict(value = CacheNames.DASHBOARD_STATS, allEntries = true)
    @com.burak.belediyeapp.audit.AuditAction(action = "REPORT_CREATE", description = "Yeni bir vatandaş raporu oluşturuldu")
    public ReportResponse createReport(CreateReportRequest request, AppUser reporter) {
        AppUser freshReporter = userRepository.findById(reporter.getId())
                .orElse(reporter);

        if (freshReporter.getSuspendedUntil() != null && freshReporter.getSuspendedUntil().isAfter(java.time.LocalDateTime.now())) {
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
            String dateStr = freshReporter.getSuspendedUntil().format(formatter);
            throw new BusinessException(
                    "Hesabınız " + dateStr + " tarihine kadar askıya alınmıştır. Gerekçe: " + freshReporter.getSuspensionReason(),
                    "USER_SUSPENDED");
        }

        if (freshReporter.getReputationScore() < 30) {
            throw new BusinessException(
                    "Güven puanınız çok düşük olduğundan yeni ihbar oluşturamazsınız.",
                    "LOW_REPUTATION_BLOCKED");
        }

        ReportCategory category = categoryRepository.findById(request.categoryId())
                .filter(ReportCategory::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Kategori", "id", request.categoryId()));

        Report report = reportMapper.toEntity(request);
        report.setCategory(category);
        report.setReporter(freshReporter);
        report.setContentLanguage(ContentLanguageDetector.detect(request.title(), request.description()));
        report.setTrackingNumber(generateUniqueTrackingNumber());

        if (freshReporter.getMunicipality() != null && !tenantAccess.isCitizenOnly(freshReporter)) {
            report.setMunicipality(freshReporter.getMunicipality());
            report.setDistrict(freshReporter.getMunicipality().getName());
        } else {
            Municipality target = reportSupport.resolveMunicipalityForCoordinates(
                    request.latitude(), request.longitude(), request.targetMunicipalityId());
            tenantAccess.ensureCategoryVisibleToMunicipality(category, target.getId());
            report.setMunicipality(target);
            report.setDistrict(ReportSupport.municipalityDisplayLabel(target));
        }

        // Abonelik durumu kontrolü
        if (report.getMunicipality() != null) {
            MembershipStatus mStatus = MembershipStatusResolver.resolve(report.getMunicipality());
            if (mStatus == MembershipStatus.SUSPENDED) {
                throw new BusinessException(
                        "Bu belediyenin üyeliği askıya alınmıştır. İhbar oluşturulamaz.",
                        "MUNICIPALITY_SUSPENDED");
            }
            if (mStatus == MembershipStatus.EXPIRED) {
                throw new BusinessException(
                        "Bu belediyenin abonelik süresi dolmuştur. İhbar oluşturulamaz.",
                        "MUNICIPALITY_EXPIRED");
            }
        }

        // KVKK rıza kaydı
        report.setKvkkApproved(Boolean.TRUE.equals(request.kvkkApproved()));
        if (report.isKvkkApproved()) {
            report.setKvkkApprovedAt(java.time.LocalDateTime.now());
        }

        final Report saved = reportRepository.saveAndFlush(report);

        if (saved.isKvkkApproved()) {
            saved.setKvkkSignature(kvkkConsentSigningService.signReportConsent(
                    saved.getId(), reporter.getEmail(), saved.getKvkkApprovedAt()));
            reportRepository.saveAndFlush(saved);
        }

        if (request.mediaUrls() != null && !request.mediaUrls().isEmpty()) {
            List<ReportMedia> mediaList = request.mediaUrls().stream()
                    .map(url -> ReportMedia.builder()
                            .imageUrl(mediaSignedUrlService.persistableStoragePath(url))
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



        if (saved.getMunicipality() != null) {
            webhookDispatchService.dispatchReportCreated(saved.getMunicipality(), saved);
        }

        eventPublisher.publishEvent(new ReportCreatedEvent(saved.getId()));
        citizenReputationService.onReportCreated(freshReporter, saved.getMunicipality());

        log.info("Yeni rapor oluşturuldu: {} — {} — ilçe={}", saved.getId(), freshReporter.getEmail(), report.getDistrict());

        Report refreshed = reportSupport.findReportOrThrow(saved.getId());
        return reportSupport.finalizeResponse(refreshed, reportMapper.toResponse(refreshed), true);
    }

    private String generateUniqueTrackingNumber() {
        java.time.LocalDate now = java.time.LocalDate.now();
        String dateStr = now.format(java.time.format.DateTimeFormatter.ofPattern("yyMMdd"));
        String alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        java.security.SecureRandom rng = new java.security.SecureRandom();
        while (true) {
            StringBuilder sb = new StringBuilder(4);
            for (int i = 0; i < 4; i++) {
                sb.append(alpha.charAt(rng.nextInt(alpha.length())));
            }
            String trackingNum = "KNT-" + dateStr + "-" + sb.toString();
            if (!reportRepository.existsByTrackingNumber(trackingNum)) {
                return trackingNum;
            }
        }
    }
}
