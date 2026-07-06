package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.request.report.CreateReportRequest;
import com.burak.belediyeapp.dto.request.report.WhiteDeskCreateReportRequest;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.config.CacheNames;
import com.burak.belediyeapp.service.admin.MembershipStatusResolver;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IReportHistoryRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.repository.IRoleRepository;
import com.burak.belediyeapp.service.ai.ContentLanguageDetector;
import com.burak.belediyeapp.service.citizen.CitizenReputationService;
import com.burak.belediyeapp.service.integration.WebhookDispatchService;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import com.burak.belediyeapp.service.security.PasswordPolicyService;
import com.burak.belediyeapp.tenant.TenantAccessService;
import com.burak.belediyeapp.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

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
    private final IMunicipalityRepository municipalityRepository;
    private final IRoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyService passwordPolicyService;

    @Value("${app.system.generated-email-domain:kentiva.app}")
    private String generatedEmailDomain;


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

        eventPublisher.publishEvent(new ReportCreatedEvent(
                saved.getId(),
                saved.getMunicipality() != null ? saved.getMunicipality().getId() : null
        ));
        citizenReputationService.onReportCreated(freshReporter, saved.getMunicipality());

        log.info("Yeni rapor oluşturuldu: {} — {} — ilçe={}", saved.getId(), freshReporter.getEmail(), report.getDistrict());

        Report refreshed = reportSupport.findReportOrThrow(saved.getId());
        return reportSupport.finalizeResponse(refreshed, reportMapper.toResponse(refreshed), true);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_WHITE_DESK','ROLE_DEPT_MANAGER','ROLE_ADMIN')")
    @CacheEvict(value = CacheNames.DASHBOARD_STATS, allEntries = true)
    @com.burak.belediyeapp.audit.AuditAction(action = "REPORT_CREATE_WHITE_DESK", description = "Beyaz Masa vatandas adina rapor olusturdu")
    public ReportResponse createReportForWhiteDesk(WhiteDeskCreateReportRequest request, AppUser staffUser) {
        String municipalityId = tenantAccess.requireStaffMunicipalityId(staffUser);
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));

        ReportCategory category = categoryRepository.findById(request.categoryId())
                .filter(ReportCategory::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Kategori", "id", request.categoryId()));
        tenantAccess.ensureCategoryVisibleToMunicipality(category, municipalityId);
        ensureMunicipalityCanReceiveReports(municipality);

        AppUser reporter = resolveOrCreateWhiteDeskReporter(request, municipality);
        CreateReportRequest mappedRequest = new CreateReportRequest(
                request.title(),
                request.description(),
                request.categoryId(),
                request.latitude(),
                request.longitude(),
                districtOrDefault(request.district(), municipality),
                request.mediaUrls(),
                municipalityId,
                request.kvkkApproved());

        Report report = reportMapper.toEntity(mappedRequest);
        report.setCategory(category);
        report.setReporter(reporter);
        report.setMunicipality(municipality);
        report.setDistrict(mappedRequest.district());
        report.setReportStatus(ReportStatus.PENDING);
        report.setContentLanguage(ContentLanguageDetector.detect(request.title(), request.description()));
        report.setTrackingNumber(generateUniqueTrackingNumber());

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
                .changedBy(staffUser)
                .note(whiteDeskHistoryNote(request, reporter, saved.getDistrict()))
                .build());

        webhookDispatchService.dispatchReportCreated(municipality, saved);
        eventPublisher.publishEvent(new ReportCreatedEvent(saved.getId(), municipality.getId()));
        citizenReputationService.onReportCreated(reporter, municipality);

        log.info("Beyaz Masa raporu olusturuldu: {} - staff={} - reporter={}",
                saved.getId(), staffUser.getEmail(), reporter.getEmail());

        Report refreshed = reportSupport.findReportOrThrow(saved.getId());
        return reportSupport.finalizeResponse(refreshed, reportMapper.toResponse(refreshed));
    }

    private void ensureMunicipalityCanReceiveReports(Municipality municipality) {
        MembershipStatus mStatus = MembershipStatusResolver.resolve(municipality);
        if (mStatus == MembershipStatus.SUSPENDED) {
            throw new BusinessException(
                    "Bu belediyenin uyeligi askiya alinmistir. Ihbar olusturulamaz.",
                    "MUNICIPALITY_SUSPENDED");
        }
        if (mStatus == MembershipStatus.EXPIRED) {
            throw new BusinessException(
                    "Bu belediyenin abonelik suresi dolmustur. Ihbar olusturulamaz.",
                    "MUNICIPALITY_EXPIRED");
        }
    }

    private AppUser resolveOrCreateWhiteDeskReporter(WhiteDeskCreateReportRequest request, Municipality municipality) {
        String email = normalizeEmail(request.reporterEmail());
        String phone = tokenOrNull(request.reporterPhoneNumber());

        Optional<AppUser> userByEmail = email == null ? Optional.empty() : userRepository.findByEmail(email);
        Optional<AppUser> userByPhone = phone == null ? Optional.empty() : userRepository.findByPhoneNumber(phone);

        if (userByEmail.isPresent() && userByPhone.isPresent()
                && !userByEmail.get().getId().equals(userByPhone.get().getId())) {
            throw new BusinessException(
                    "E-posta ve telefon farkli kullanicilara ait gorunuyor.",
                    "WHITE_DESK_REPORTER_CONFLICT");
        }

        AppUser existing = userByEmail.or(() -> userByPhone).orElse(null);
        if (existing != null) {
            if (!existing.hasRole("ROLE_CITIZEN")) {
                throw new BusinessException(
                        "Bu iletisim bilgisi belediye personeline ait gorunuyor.",
                        "WHITE_DESK_REPORTER_NOT_CITIZEN");
            }
            if (existing.getPreferredMunicipality() == null) {
                existing.setPreferredMunicipality(municipality);
                return userRepository.save(existing);
            }
            return existing;
        }

        Role citizenRole = roleRepository.findByName("ROLE_CITIZEN")
                .orElseThrow(() -> new ResourceNotFoundException("Rol", "name", "ROLE_CITIZEN"));

        AppUser newReporter = new AppUser();
        newReporter.setEmail(email != null ? email : generateWhiteDeskEmail(municipality));
        newReporter.setPassword(passwordEncoder.encode(passwordPolicyService.generateStrongPassword(16, false)));
        newReporter.setFirstName(defaultValue(request.reporterFirstName(), "Vatandas"));
        newReporter.setLastName(defaultValue(request.reporterLastName(), "Basvurusu"));
        newReporter.setPhoneNumber(phone);
        newReporter.setEnabled(true);
        newReporter.setPreferredMunicipality(municipality);
        newReporter.setReputationScore(100);
        newReporter.setLoyaltyPoints(100);
        newReporter.setKvkkApproved(Boolean.TRUE.equals(request.kvkkApproved()));
        if (newReporter.isKvkkApproved()) {
            newReporter.setKvkkApprovedAt(java.time.LocalDateTime.now());
        }
        Set<Role> roles = new HashSet<>(Collections.singleton(citizenRole));
        newReporter.setRoles(roles);
        return userRepository.save(newReporter);
    }

    private String whiteDeskHistoryNote(WhiteDeskCreateReportRequest request, AppUser reporter, String district) {
        StringBuilder note = new StringBuilder("Beyaz Masa tarafindan olusturuldu");
        note.append(" - vatandas: ").append(reporter.getFullName());
        if (tokenOrNull(request.reporterPhoneNumber()) != null) {
            note.append(" - tel: ").append(tokenOrNull(request.reporterPhoneNumber()));
        }
        note.append(" - bolge: ").append(district);
        if (tokenOrNull(request.consentNote()) != null) {
            note.append(" - riza notu: ").append(tokenOrNull(request.consentNote()));
        }
        return note.toString();
    }

    private String districtOrDefault(String value, Municipality municipality) {
        String normalized = tokenOrNull(value);
        return normalized != null ? normalized : ReportSupport.municipalityDisplayLabel(municipality);
    }

    private String normalizeEmail(String email) {
        String normalized = tokenOrNull(email);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }

    private String tokenOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String defaultValue(String value, String fallback) {
        String normalized = tokenOrNull(value);
        return normalized != null ? normalized : fallback;
    }

    private String generateWhiteDeskEmail(Municipality municipality) {
        String slug = tokenOrNull(municipality.getSlug());
        if (slug == null) {
            slug = SlugUtils.slugify(ReportSupport.municipalityDisplayLabel(municipality));
        }
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return "whitedesk-" + slug + "-" + suffix + "@" + generatedEmailDomain();
    }

    private String generatedEmailDomain() {
        String normalized = tokenOrNull(generatedEmailDomain);
        return normalized != null ? normalized : "kentiva.app";
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
