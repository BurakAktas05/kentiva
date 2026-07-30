package com.burak.belediyeapp.service.report;

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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportImportServiceTenantReuseTest {

    @Mock
    private IAppUserRepository userRepository;

    @InjectMocks
    private ReportImportService reportImportService;

    @Test
    void resolveOrCreateReporter_RejectsForeignPreferredMunicipality() {
        Municipality current = municipality("muni-1");
        Municipality foreign = municipality("muni-2");

        AppUser existing = new AppUser();
        existing.setId("citizen-1");
        existing.setEmail("import@example.com");
        existing.setPreferredMunicipality(foreign);

        when(userRepository.findByEmail("import@example.com")).thenReturn(Optional.of(existing));

        // CSV columns: title, description, category, lat, lng, email, phone, firstName, lastName
        Object row = ReflectionTestUtils.invokeMethod(
                reportImportService,
                "parseCsvRow",
                java.util.List.of(
                        "Başlık örneği yeterli uzunlukta",
                        "Açıklama metni yeterince uzun olmalı burada",
                        "Yol",
                        "41.0",
                        "29.0",
                        "import@example.com",
                        "",
                        "Ali",
                        "Veli"),
                2);

        Role citizenRole = new Role();
        citizenRole.setName("ROLE_CITIZEN");

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> ReflectionTestUtils.invokeMethod(
                        reportImportService,
                        "resolveOrCreateReporter",
                        row,
                        current,
                        citizenRole));

        assertEquals("IMPORT_REPORTER_MUNICIPALITY_MISMATCH", ex.getErrorCode());
    }

    private static Municipality municipality(String id) {
        Municipality municipality = new Municipality();
        municipality.setId(id);
        municipality.setName(id);
        return municipality;
    }
}
