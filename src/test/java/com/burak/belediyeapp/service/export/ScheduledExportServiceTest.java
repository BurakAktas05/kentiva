package com.burak.belediyeapp.service.export;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.ExportRun;
import com.burak.belediyeapp.entity.ExportSchedule;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IExportRunRepository;
import com.burak.belediyeapp.repository.IExportScheduleRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.service.email.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduledExportServiceTest {

    @Mock
    private IExportScheduleRepository scheduleRepository;

    @Mock
    private IExportRunRepository runRepository;

    @Mock
    private IMunicipalityRepository municipalityRepository;

    @Mock
    private ExportService exportService;

    @Mock
    private IAppUserRepository userRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private ScheduledExportService scheduledExportService;

    private Municipality municipality;
    private AppUser manager;
    private ExportSchedule schedule;

    @BeforeEach
    void setUp() {
        org.springframework.test.util.ReflectionTestUtils.setField(scheduledExportService, "uploadDir", "uploads");

        municipality = new Municipality();
        municipality.setId("muni-1");
        municipality.setName("Test Municipality");

        manager = new AppUser();
        manager.setEmail("manager@test.com");
        manager.setFirstName("John");
        manager.setLastName("Doe");

        schedule = ExportSchedule.builder()
                .municipality(municipality)
                .frequency(ExportSchedule.ExportFrequency.MONTHLY)
                .format(ExportSchedule.ExportFormat.PDF)
                .hourOfDay(9)
                .enabled(true)
                .build();
        schedule.setId("schedule-1");
    }

    @Test
    void calculateNextRunAt_Monthly() {
        LocalDateTime nextRun = scheduledExportService.calculateNextRunAt(schedule);
        assertNotNull(nextRun);
        assertEquals(9, nextRun.getHour());
        assertEquals(0, nextRun.getMinute());
        assertEquals(1, nextRun.getDayOfMonth());
        assertTrue(nextRun.isAfter(LocalDateTime.now(ZoneId.of("Europe/Istanbul"))));
    }

    @Test
    void executeSchedule_SuccessAndSendsEmail() throws IOException {
        Path tempFile = Files.createTempFile("kentiva-test-export", ".pdf");
        try {
            when(exportService.writeExportFile(any(), any(), any())).thenReturn(tempFile);
            when(userRepository.findAllByRoles_NameAndMunicipalityId(eq("ROLE_DEPT_MANAGER"), eq("muni-1")))
                    .thenReturn(List.of(manager));
            when(runRepository.save(any(ExportRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

            ExportRun run = scheduledExportService.executeSchedule(schedule);

            assertNotNull(run);
            assertEquals(ExportRun.RunStatus.SUCCESS, run.getStatus());
            assertEquals(tempFile.getFileName().toString(), run.getFileName());

            verify(emailService, times(1)).sendEmailWithAttachment(
                    eq("manager@test.com"),
                    contains("Test Municipality"),
                    contains("aylık"),
                    any(File.class)
            );
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    @Test
    void executeSchedule_NoManagersSkippedEmail() throws IOException {
        Path tempFile = Files.createTempFile("kentiva-test-export", ".pdf");
        try {
            when(exportService.writeExportFile(any(), any(), any())).thenReturn(tempFile);
            when(userRepository.findAllByRoles_NameAndMunicipalityId(eq("ROLE_DEPT_MANAGER"), eq("muni-1")))
                    .thenReturn(Collections.emptyList());
            when(runRepository.save(any(ExportRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

            ExportRun run = scheduledExportService.executeSchedule(schedule);

            assertNotNull(run);
            assertEquals(ExportRun.RunStatus.SUCCESS, run.getStatus());
            verifyNoInteractions(emailService);
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    @Test
    void executeSchedule_EmailFailsDoesNotRollback() throws IOException {
        Path tempFile = Files.createTempFile("kentiva-test-export", ".pdf");
        try {
            when(exportService.writeExportFile(any(), any(), any())).thenReturn(tempFile);
            when(userRepository.findAllByRoles_NameAndMunicipalityId(eq("ROLE_DEPT_MANAGER"), eq("muni-1")))
                    .thenReturn(List.of(manager));
            doThrow(new RuntimeException("SMTP Server Down"))
                    .when(emailService).sendEmailWithAttachment(anyString(), anyString(), anyString(), any(File.class));
            when(runRepository.save(any(ExportRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // Should not throw exception since it is wrapped in try-catch (fail-safe)
            ExportRun run = assertDoesNotThrow(() -> scheduledExportService.executeSchedule(schedule));

            assertNotNull(run);
            assertEquals(ExportRun.RunStatus.SUCCESS, run.getStatus());
            verify(runRepository, times(1)).save(any(ExportRun.class));
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }
}
