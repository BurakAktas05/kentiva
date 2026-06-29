package com.burak.belediyeapp.integration;

import com.burak.belediyeapp.dto.request.auth.LoginRequest;
import com.burak.belediyeapp.dto.request.auth.RegisterRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityOnboardingRequest;
import com.burak.belediyeapp.dto.request.report.CreateReportRequest;
import com.burak.belediyeapp.dto.response.auth.AuthResponse;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityOnboardingResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.auth.AuthService;
import com.burak.belediyeapp.service.municipality.MunicipalityOnboardingService;
import com.burak.belediyeapp.service.report.ReportCreationService;
import com.burak.belediyeapp.tenant.TenantAccessService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@EnabledIfDocker
@Testcontainers
class KentivaFlowIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgis/postgis:16-3.4")
            .withDatabaseName("belediyeapp")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("app.cache.type", () -> "none");
    }

    @Autowired
    private MunicipalityOnboardingService onboardingService;

    @Autowired
    private AuthService authService;

    @Autowired
    private ReportCreationService reportCreationService;

    @Autowired
    private TenantAccessService tenantAccessService;

    @Autowired
    private IMunicipalityRepository municipalityRepository;

    @Autowired
    private IAppUserRepository userRepository;

    @Autowired
    private IReportRepository reportRepository;

    @MockitoBean
    private com.burak.belediyeapp.service.geo.OsmBoundaryService osmBoundaryService;

    @MockitoBean
    private com.burak.belediyeapp.service.ai.GeminiService geminiService;

    @Test
    @Transactional
    void fullKentivaFlowAndTenantIsolationTest() {
        // 1. Onboard Municipality A
        MunicipalityOnboardingRequest.MunicipalityPart muniPartA = new MunicipalityOnboardingRequest.MunicipalityPart(
                "Kadikoy Belediyesi",
                "kadikoy",
                "Kadıköy Belediyesi",
                40.99, 29.02, 13,
                "Gülümseyen Kadıköy",
                null, "SIMPLE",
                null, "34-kadikoy"
        );
        MunicipalityOnboardingRequest.AdminPart adminPartA = new MunicipalityOnboardingRequest.AdminPart(
                "admin_kadikoy@kentiva.app",
                "Password123!",
                "Kadikoy Admin",
                "+902160000000"
        );
        MunicipalityOnboardingRequest.CategoryPart catPartA = new MunicipalityOnboardingRequest.CategoryPart(
                "Yol ve Kaldırım",
                "Yol hasarları ve çukurlar",
                "road"
        );

        MunicipalityOnboardingRequest requestA = new MunicipalityOnboardingRequest(
                muniPartA, adminPartA, null, List.of(), List.of(catPartA)
        );

        MunicipalityOnboardingResponse responseA = onboardingService.onboard(requestA);
        assertThat(responseA.municipality().id()).isNotNull();
        assertThat(responseA.admin().email()).isEqualTo("admin_kadikoy@kentiva.app");

        // Seed boundaries for Municipality A so coordinates are within boundaries
        municipalityRepository.updateBoundariesFromGeoJson(responseA.municipality().id(), """
                {
                  "type": "Polygon",
                  "coordinates": [
                    [
                      [29.0, 40.9],
                      [29.1, 40.9],
                      [29.1, 41.0],
                      [29.0, 41.0],
                      [29.0, 40.9]
                    ]
                  ]
                }
                """);

        // 2. Onboard Municipality B (for tenant isolation check)
        MunicipalityOnboardingRequest.MunicipalityPart muniPartB = new MunicipalityOnboardingRequest.MunicipalityPart(
                "Besiktas Belediyesi",
                "besiktas",
                "Beşiktaş Belediyesi",
                41.04, 29.00, 13,
                "Beşiktaşım",
                null, "SIMPLE",
                null, "34-besiktas"
        );
        MunicipalityOnboardingRequest.AdminPart adminPartB = new MunicipalityOnboardingRequest.AdminPart(
                "admin_besiktas@kentiva.app",
                "Password123!",
                "Besiktas Admin",
                "+902120000000"
        );
        MunicipalityOnboardingRequest.CategoryPart catPartB = new MunicipalityOnboardingRequest.CategoryPart(
                "Yol ve Kaldırım",
                "Yol hasarları ve çukurlar",
                "road"
        );

        MunicipalityOnboardingRequest requestB = new MunicipalityOnboardingRequest(
                muniPartB, adminPartB, null, List.of(), List.of(catPartB)
        );

        MunicipalityOnboardingResponse responseB = onboardingService.onboard(requestB);
        assertThat(responseB.municipality().id()).isNotNull();

        // 3. Login as Municipality A Admin
        AuthResponse adminLoginResponse = authService.login(new LoginRequest(
                "admin_kadikoy@kentiva.app", "Password123!"
        ));
        assertThat(adminLoginResponse.accessToken()).isNotNull();

        // 4. Register Citizen User
        RegisterRequest citizenRegister = new RegisterRequest(
                "Vatandas",
                "User",
                "citizen@example.com",
                "Password123!",
                "+905555555555",
                "000000",
                true,
                null,
                null
        );
        AuthResponse citizenRegisterResponse = authService.register(citizenRegister);
        assertThat(citizenRegisterResponse.accessToken()).isNotNull();

        AppUser citizen = userRepository.findById(citizenRegisterResponse.userId())
                .orElseThrow();

        // 5. Create Report in Municipality A
        String catIdA = responseA.categoriesCreated().get(0).id();
        CreateReportRequest reportRequest = new CreateReportRequest(
                "Çöp Yığını Başlığı Çok Uzun", // Min 10 characters
                "Sokak köşesinde çöp yığılmış durumdadır. Lütfen acil toplayın.", // Min 20 characters
                catIdA,
                40.992,
                29.023, // Coordinates inside Kadıköy limits
                "Kadıköy",
                List.of(),
                responseA.municipality().id(),
                true
        );

        ReportResponse reportResponse = reportCreationService.createReport(reportRequest, citizen);
        assertThat(reportResponse.id()).isNotNull();
        assertThat(reportResponse.status()).isEqualTo("PENDING");

        // 6. Test Tenant Isolation
        // Load Municipality B Admin User
        AppUser adminB = userRepository.findByEmail("admin_besiktas@kentiva.app").orElseThrow();
        AppUser adminA = userRepository.findByEmail("admin_kadikoy@kentiva.app").orElseThrow();

        // Admin A should be able to view report in Muni A
        Report report = reportRepository.findById(reportResponse.id()).orElseThrow();
        tenantAccessService.ensureCanViewReport(report, adminA);

        // Admin B (Besiktas) should NOT be able to view report from Kadikoy
        assertThatThrownBy(() -> tenantAccessService.ensureCanViewReport(report, adminB))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Bu kaynağa erişim yetkiniz yok");
    }
}
