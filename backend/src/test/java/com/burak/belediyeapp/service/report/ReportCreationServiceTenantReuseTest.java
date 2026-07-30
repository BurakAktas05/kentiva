package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.request.report.WhiteDeskCreateReportRequest;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportCreationServiceTenantReuseTest {

    @Mock
    private IAppUserRepository userRepository;

    @InjectMocks
    private ReportCreationService reportCreationService;

    @Test
    void resolveOrCreateWhiteDeskReporter_RejectsForeignPreferredMunicipality() {
        Municipality current = municipality("muni-1");
        Municipality foreign = municipality("muni-2");

        AppUser existing = new AppUser();
        existing.setId("citizen-1");
        existing.setEmail("citizen@example.com");
        existing.setPreferredMunicipality(foreign);
        Role citizen = new Role();
        citizen.setName("ROLE_CITIZEN");
        existing.setRoles(Set.of(citizen));

        when(userRepository.findByEmail("citizen@example.com")).thenReturn(Optional.of(existing));

        WhiteDeskCreateReportRequest request = new WhiteDeskCreateReportRequest(
                "Ali",
                "Veli",
                "citizen@example.com",
                null,
                "Yol çukuru bildirimi",
                "Cadde üzerinde derin bir çukur oluştu ve tehlike yaratıyor.",
                "cat-1",
                41.0,
                29.0,
                "Kadıköy",
                null,
                true,
                "Sözlü onay alındı");

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> ReflectionTestUtils.invokeMethod(
                        reportCreationService,
                        "resolveOrCreateWhiteDeskReporter",
                        request,
                        current));

        assertEquals("WHITE_DESK_REPORTER_MUNICIPALITY_MISMATCH", ex.getErrorCode());
    }

    private static Municipality municipality(String id) {
        Municipality municipality = new Municipality();
        municipality.setId(id);
        municipality.setName(id);
        return municipality;
    }
}
