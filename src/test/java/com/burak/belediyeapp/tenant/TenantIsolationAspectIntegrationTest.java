package com.burak.belediyeapp.tenant;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.exception.BusinessException;
import org.aspectj.lang.JoinPoint;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * TenantIsolationAspect — çapraz belediye erişim denetimi entegrasyon testi.
 *
 * Test, aynı pakette olduğu için verifyReadResult'a doğrudan erişir.
 */
@ExtendWith(MockitoExtension.class)
class TenantIsolationAspectIntegrationTest {

    private TenantIsolationAspect aspect;

    @Mock
    private JoinPoint joinPoint;

    private Municipality muniA;
    private Municipality muniB;
    private AppUser userA;

    @BeforeEach
    void setUp() {
        aspect = new TenantIsolationAspect();

        muniA = new Municipality();
        muniA.setId("muni-A");
        muniA.setName("Belediye A");

        muniB = new Municipality();
        muniB.setId("muni-B");
        muniB.setName("Belediye B");

        userA = new AppUser();
        userA.setId("user-1");
        userA.setEmail("user@munia.gov.tr");
        userA.setMunicipality(muniA);
        userA.setFirstName("Test");
        userA.setLastName("User");
        userA.setPassword("encoded");
        userA.setRoles(Set.of());

        authenticateAs(userA);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Farklı belediyeye ait entity okuma — CROSS_MUNICIPALITY_ACCESS hatası")
    void verifyReadResult_crossMunicipalityEntity_throwsBusinessException() {
        Report reportFromB = Report.builder()
                .title("Test İhbar")
                .description("Farklı belediye ihbarı")
                .municipality(muniB)
                .build();
        reportFromB.setId("report-B");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> aspect.verifyReadResult(joinPoint, reportFromB));

        assertEquals("CROSS_MUNICIPALITY_ACCESS", ex.getErrorCode());
    }

    @Test
    @DisplayName("Aynı belediyeye ait entity okuma — başarılı geçiş")
    void verifyReadResult_sameMunicipalityEntity_passes() {
        Report reportFromA = Report.builder()
                .title("Test İhbar")
                .description("Aynı belediye ihbarı")
                .municipality(muniA)
                .build();
        reportFromA.setId("report-A");

        assertDoesNotThrow(() -> aspect.verifyReadResult(joinPoint, reportFromA));
    }

    @Test
    @DisplayName("Municipality null olan entity — bypass, hata fırlatılmaz")
    void verifyReadResult_nullMunicipalityEntity_passes() {
        Report globalReport = Report.builder()
                .title("Global İhbar")
                .description("Belediye atanmamış")
                .build();
        globalReport.setId("report-global");

        assertDoesNotThrow(() -> aspect.verifyReadResult(joinPoint, globalReport));
    }

    private void authenticateAs(AppUser user) {
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
