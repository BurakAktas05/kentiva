package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.request.report.BulkAssignReportsRequest;
import com.burak.belediyeapp.dto.request.report.CreateReportRequest;
import com.burak.belediyeapp.dto.request.report.UpdateReportStatusRequest;
import com.burak.belediyeapp.dto.request.report.WhiteDeskCreateReportRequest;
import com.burak.belediyeapp.dto.response.report.BulkReportOperationResult;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.*;
import com.burak.belediyeapp.service.ai.GeminiService;
import com.burak.belediyeapp.service.ai.HeuristicReportAnalyzer;
import com.burak.belediyeapp.service.citizen.CitizenReputationService;
import com.burak.belediyeapp.service.geo.DistrictResolutionService;
import com.burak.belediyeapp.service.integration.WebhookDispatchService;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import com.burak.belediyeapp.service.notification.NotificationService;
import com.burak.belediyeapp.service.security.KvkkConsentSigningService;
import com.burak.belediyeapp.service.security.PasswordPolicyService;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.tenant.TenantAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.atLeastOnce;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock IReportRepository reportRepository;
    @Mock IReportCategoryRepository categoryRepository;
    @Mock IAppUserRepository userRepository;
    @Mock IReportHistoryRepository historyRepository;
    @Mock IDepartmentRepository departmentRepository;
    @Mock IRefreshTokenRepository refreshTokenRepository;
    @Mock IRoleRepository roleRepository;
    @Mock IReportMapper reportMapper;
    @Mock NotificationService notificationService;
    @Mock GeminiService geminiService;
    @Mock HeuristicReportAnalyzer heuristicReportAnalyzer;
    @Mock DistrictResolutionService districtResolutionService;
    @Mock IMunicipalityRepository municipalityRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock WebhookDispatchService webhookDispatchService;
    @Mock MediaSignedUrlService mediaSignedUrlService;
    @Mock ReportDuplicateLinkService duplicateLinkService;
    @Mock CitizenReputationService citizenReputationService;
    @Mock KvkkConsentSigningService kvkkConsentSigningService;
    @Mock QrCodeService qrCodeService;
    @Mock JwtAuthenticationSupport jwtAuthenticationSupport;
    @Mock PasswordEncoder passwordEncoder;
    @Mock PasswordPolicyService passwordPolicyService;

    private TenantAccessService tenantAccess;
    private ReportSupport reportSupport;
    private ReportCreationService creationService;
    private ReportQueryService queryService;
    private ReportCommandService commandService;

    @BeforeEach
    void wireServices() {
        tenantAccess = new TenantAccessService();
        reportSupport = new ReportSupport(
                reportRepository,
                municipalityRepository,
                districtResolutionService,
                mediaSignedUrlService,
                duplicateLinkService,
                qrCodeService);
        creationService = new ReportCreationService(
                reportRepository,
                categoryRepository,
                historyRepository,
                reportMapper,
                reportSupport,
                tenantAccess,
                mediaSignedUrlService,
                eventPublisher,
                duplicateLinkService,
                webhookDispatchService,
                citizenReputationService,
                kvkkConsentSigningService,
                userRepository,
                municipalityRepository,
                roleRepository,
                passwordEncoder,
                passwordPolicyService);

        queryService = new ReportQueryService(
                reportRepository,
                historyRepository,
                reportMapper,
                reportSupport,
                tenantAccess,
                duplicateLinkService);

        commandService = new ReportCommandService(
                reportRepository,
                categoryRepository,
                userRepository,
                historyRepository,
                departmentRepository,
                refreshTokenRepository,
                reportMapper,
                reportSupport,
                tenantAccess,
                notificationService,
                geminiService,
                heuristicReportAnalyzer,
                webhookDispatchService,
                citizenReputationService,
                mediaSignedUrlService,
                jwtAuthenticationSupport);
        // @Lazy self-injection — testte aynı instance ile değiştir.
        try {
            java.lang.reflect.Field selfField = ReportCommandService.class.getDeclaredField("self");
            selfField.setAccessible(true);
            selfField.set(commandService, commandService);
        } catch (Exception ignored) {
            // Test runner CGLIB kullanıyorsa veya alan eksikse: self ile çağrılan
            // metotlar üretimde proxy üzerinden çalışır, testte doğrudan invoke edilir.
        }
    }

    @Test
    void citizenCreateReportAssignsMunicipalityFromGpsNotAccount() {
        AppUser citizen = user("citizen-1", "ROLE_CITIZEN", null);

        ReportCategory category = ReportCategory.builder().name("Yol").active(true).build();
        category.setId("cat-1");
        Municipality resolved = municipality("municipality-gps", "Safranbolu Belediyesi", true, true);

        CreateReportRequest request = new CreateReportRequest(
                "Başlık yeterince uzun",
                "Açıklama en az yirmi karakter olmalıdır burada.",
                "cat-1",
                41.25,
                32.69,
                null,
                List.of(),
                null,
                true);

        Report mapped = new Report();
        mapped.setTitle(request.title());

        when(categoryRepository.findById("cat-1")).thenReturn(Optional.of(category));
        when(districtResolutionService.resolveDistrict(41.25, 32.69)).thenReturn(Optional.of("municipality-gps"));
        when(municipalityRepository.findById("municipality-gps")).thenReturn(Optional.of(resolved));
        when(reportMapper.toEntity(request)).thenReturn(mapped);
        when(reportRepository.saveAndFlush(any())).thenAnswer(inv -> {
            Report r = inv.getArgument(0);
            r.setId("report-new");
            r.setMunicipality(resolved);
            return r;
        });
        when(reportRepository.findById("report-new")).thenAnswer(inv -> {
            Report r = new Report();
            r.setId("report-new");
            r.setMunicipality(resolved);
            return Optional.of(r);
        });
        when(reportMapper.toResponse(any())).thenReturn(new ReportResponse(
                "report-new", request.title(), request.description(), "PENDING", "Yol", "Vatandaş", null,
                41.25, 32.69, null, null, List.of(), List.of(), "Safranbolu Belediyesi",
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, false));

        creationService.createReport(request, citizen);

        verify(municipalityRepository).findById("municipality-gps");
        verify(reportRepository, atLeastOnce()).saveAndFlush(any());
    }

    @Test
    void citizenCreateReportRejectsLocationOutsideMunicipalities() {
        AppUser citizen = user("citizen-2", "ROLE_CITIZEN", null);
        ReportCategory category = ReportCategory.builder().name("Yol").active(true).build();
        category.setId("cat-1");
        CreateReportRequest request = new CreateReportRequest(
                "Başlık yeterince uzun",
                "Açıklama en az yirmi karakter olmalıdır burada.",
                "cat-1",
                0.0,
                0.0,
                null,
                List.of(),
                null,
                true);

        when(categoryRepository.findById("cat-1")).thenReturn(Optional.of(category));
        when(reportMapper.toEntity(request)).thenReturn(new Report());
        when(districtResolutionService.resolveDistrict(0.0, 0.0)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> creationService.createReport(request, citizen))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("belediye");

        verify(reportRepository, never()).save(any());
    }

    @Test
    void citizenCreateReportRejectsUnknownTargetHint() {
        // Davranış değişti: vatandaş belediye seçtiyse spatial GPS kontrolü atlanır
        // (UX kararı). Sadece SEÇİLEN belediye var olmalı ve aktif olmalı; bilinmeyen
        // belediye ID → MUNICIPALITY_NOT_FOUND ile hata.
        AppUser citizen = user("citizen-3", "ROLE_CITIZEN", null);
        ReportCategory category = ReportCategory.builder().name("Yol").active(true).build();
        category.setId("cat-1");
        CreateReportRequest request = new CreateReportRequest(
                "Başlık yeterince uzun",
                "Açıklama en az yirmi karakter olmalıdır burada.",
                "cat-1",
                41.25,
                32.69,
                null,
                List.of(),
                "wrong-municipality",
                true);

        when(categoryRepository.findById("cat-1")).thenReturn(Optional.of(category));
        when(reportMapper.toEntity(request)).thenReturn(new Report());
        when(municipalityRepository.findById("wrong-municipality")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> creationService.createReport(request, citizen))
                .isInstanceOf(BusinessException.class);

        verify(reportRepository, never()).save(any());
    }

    @Test
    void citizenCreateReportRejectsLocationOutsideSelectedMunicipalityBoundaries() {
        AppUser citizen = user("citizen-4", "ROLE_CITIZEN", null);
        ReportCategory category = ReportCategory.builder().name("Yol").active(true).build();
        category.setId("cat-1");
        Municipality resolved = municipality("safranbolu", "Safranbolu Belediyesi", true, true);

        CreateReportRequest request = new CreateReportRequest(
                "Başlık yeterince uzun",
                "Açıklama en az yirmi karakter olmalıdır burada.",
                "cat-1",
                52.52,
                13.40,
                null,
                List.of(),
                "safranbolu",
                true);

        when(categoryRepository.findById("cat-1")).thenReturn(Optional.of(category));
        when(reportMapper.toEntity(request)).thenReturn(new Report());
        when(municipalityRepository.findById("safranbolu")).thenReturn(Optional.of(resolved));
        when(municipalityRepository.isWithinBoundaries("safranbolu", 52.52, 13.40)).thenReturn(false);

        assertThatThrownBy(() -> creationService.createReport(request, citizen))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("sınırları dışındadır");

        verify(reportRepository, never()).save(any());
    }

    @Test
    void whiteDeskCreateReportCreatesCitizenAndReportInStaffMunicipality() {
        AppUser staff = user("desk-1", "ROLE_WHITE_DESK", "municipality-a");
        Municipality municipality = staff.getMunicipality();
        ReportCategory category = ReportCategory.builder().name("Yol").active(true).build();
        category.setId("cat-1");
        Role citizenRole = new Role();
        citizenRole.setName("ROLE_CITIZEN");
        WhiteDeskCreateReportRequest request = new WhiteDeskCreateReportRequest(
                "Ayse",
                "Yilmaz",
                "ayse@example.com",
                "05551234567",
                "Park lambasi arizali",
                "Mahalle parkindaki aydinlatma iki gundur calismiyor.",
                "cat-1",
                41.0,
                29.0,
                "Merkez",
                List.of(),
                true,
                "Telefon gorusmesinde sozlu onay alindi.");
        AtomicReference<Report> savedReport = new AtomicReference<>();

        when(municipalityRepository.findById("municipality-a")).thenReturn(Optional.of(municipality));
        when(categoryRepository.findById("cat-1")).thenReturn(Optional.of(category));
        when(userRepository.findByEmail("ayse@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByPhoneNumber("05551234567")).thenReturn(Optional.empty());
        when(roleRepository.findByName("ROLE_CITIZEN")).thenReturn(Optional.of(citizenRole));
        when(passwordPolicyService.generateStrongPassword(16, false)).thenReturn("generated-password");
        when(passwordEncoder.encode("generated-password")).thenReturn("encoded-password");
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> {
            AppUser reporter = inv.getArgument(0);
            reporter.setId("citizen-white-desk");
            return reporter;
        });
        when(reportMapper.toEntity(any(CreateReportRequest.class))).thenReturn(new Report());
        when(reportRepository.saveAndFlush(any(Report.class))).thenAnswer(inv -> {
            Report report = inv.getArgument(0);
            report.setId("report-white-desk");
            savedReport.set(report);
            return report;
        });
        when(kvkkConsentSigningService.signReportConsent(eq("report-white-desk"), eq("ayse@example.com"), any()))
                .thenReturn("signed-consent");
        when(reportRepository.findById("report-white-desk")).thenAnswer(inv -> Optional.of(savedReport.get()));
        when(reportMapper.toResponse(any())).thenReturn(new ReportResponse(
                "report-white-desk", request.title(), request.description(), "PENDING", "Yol", "Ayse Yilmaz", null,
                41.0, 29.0, null, null, List.of(), List.of(), "Merkez",
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, false));

        ReportResponse response = creationService.createReportForWhiteDesk(request, staff);

        assertThat(response.id()).isEqualTo("report-white-desk");
        assertThat(savedReport.get().getMunicipality()).isSameAs(municipality);
        assertThat(savedReport.get().getReporter().getEmail()).isEqualTo("ayse@example.com");
        assertThat(savedReport.get().getReporter().getPreferredMunicipality()).isSameAs(municipality);
        verify(historyRepository).save(any());
        verify(webhookDispatchService).dispatchReportCreated(eq(municipality), any(Report.class));
        verify(citizenReputationService).onReportCreated(any(AppUser.class), eq(municipality));
    }

    @Test
    void suspendReporterOfReportSetsEnabledToFalse() {
        Report report = report("report-suspend", "municipality-a", ReportStatus.PENDING);
        AppUser reporter = report.getReporter();
        reporter.setEnabled(true);

        when(reportRepository.findById("report-suspend")).thenReturn(Optional.of(report));

        commandService.suspendReporterOfReport("report-suspend");

        assertThat(reporter.isEnabled()).isFalse();
        verify(userRepository).save(reporter);
        verify(refreshTokenRepository).revokeAllByUserId(reporter.getId());
        verify(jwtAuthenticationSupport).evictCache(reporter.getEmail());
    }

    @Test
    void staffCannotReadReportFromAnotherMunicipality() {
        Report report = report("report-1", "municipality-a", ReportStatus.PENDING);
        AppUser admin = user("admin-1", "ROLE_ADMIN", "municipality-b");
        when(reportRepository.findById("report-1")).thenReturn(Optional.of(report));

        assertThatThrownBy(() -> queryService.getReportById("report-1", admin))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Bu rapora erişim yetkiniz yok");
    }

    @Test
    void statusUpdatePersistsHistoryAndNotifiesReporterWhenInScope() {
        Report report = report("report-1", "municipality-a", ReportStatus.PENDING);
        AppUser admin = user("admin-1", "ROLE_ADMIN", "municipality-a");
        UpdateReportStatusRequest request = new UpdateReportStatusRequest(ReportStatus.PROCESSING, "Saha ekibine alındı", null);
        ReportResponse response = new ReportResponse(
                "report-1", "Başlık", "Açıklama", "PROCESSING", "Kategori", "Muhabir", null,
                41.0, 29.0, null, null, List.of(), List.of(), "İlçe",
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, false);

        when(reportRepository.findById("report-1")).thenReturn(Optional.of(report));
        when(reportRepository.save(report)).thenReturn(report);
        when(reportMapper.toResponse(report)).thenReturn(response);

        commandService.updateReportStatus("report-1", request, admin);

        verify(historyRepository).save(any());
        verify(notificationService).notifyReportStatusChanged(report);
        verify(reportRepository).save(report);
    }

    @Test
    void bulkAssignSkipsCrossMunicipalityReports() {
        Report inScope = report("r1", "municipality-a", ReportStatus.PENDING);
        Report outScope = report("r2", "municipality-b", ReportStatus.PENDING);
        AppUser manager = user("mgr-1", "ROLE_DEPT_MANAGER", "municipality-a");
        AppUser officer = user("officer-1", "ROLE_FIELD_OFFICER", "municipality-a");

        when(reportRepository.findById("r1")).thenReturn(Optional.of(inScope));
        when(reportRepository.findById("r2")).thenReturn(Optional.of(outScope));
        when(userRepository.findByIdAndMunicipalityId("officer-1", "municipality-a"))
                .thenReturn(Optional.of(officer));
        when(reportRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(reportMapper.toResponse(any())).thenReturn(new ReportResponse(
                "r1", "Başlık", "Açıklama", "PROCESSING", "Kategori", "Muhabir", "Görevli",
                41.0, 29.0, null, null, List.of(), List.of(), "İlçe",
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, false));

        BulkReportOperationResult result = commandService.bulkAssignReports(
                new BulkAssignReportsRequest(List.of("r1", "r2"), "officer-1"), manager);

        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.failureCount()).isEqualTo(1);
    }

    private Report report(String id, String municipalityId, ReportStatus status) {
        Municipality municipality = municipality(municipalityId, municipalityId, true, true);
        AppUser reporter = user("citizen-1", "ROLE_CITIZEN", municipalityId);

        Report report = new Report();
        report.setId(id);
        report.setMunicipality(municipality);
        report.setReporter(reporter);
        report.setReportStatus(status);
        return report;
    }

    private AppUser user(String id, String roleName, String municipalityId) {
        Role role = new Role();
        role.setName(roleName);

        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail(id + "@example.com");
        if (municipalityId != null) {
            user.setMunicipality(municipality(municipalityId, municipalityId, true, true));
        }
        user.setRoles(Set.of(role));
        return user;
    }

    private static Municipality municipality(String id, String displayName, boolean active, boolean onboarded) {
        Municipality municipality = new Municipality();
        municipality.setId(id);
        municipality.setName(displayName);
        municipality.setDisplayName(displayName);
        municipality.setActive(active);
        municipality.setOnboarded(onboarded);
        return municipality;
    }
}
