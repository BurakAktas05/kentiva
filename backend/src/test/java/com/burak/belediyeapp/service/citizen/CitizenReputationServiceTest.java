package com.burak.belediyeapp.service.citizen;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.repository.IReputationAuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CitizenReputationServiceTest {

    @Mock
    private IAppUserRepository userRepository;

    @Mock
    private IReportRepository reportRepository;

    @Mock
    private JwtAuthenticationSupport jwtAuthenticationSupport;

    @Mock
    private IReputationAuditLogRepository reputationAuditLogRepository;

    @InjectMocks
    private CitizenReputationService citizenReputationService;

    private AppUser reporter;
    private Report report;

    @BeforeEach
    void setUp() {
        Role citizenRole = new Role();
        citizenRole.setName("ROLE_CITIZEN");

        reporter = new AppUser();
        reporter.setId("user-1");
        reporter.setEmail("citizen@example.com");
        reporter.setRoles(Set.of(citizenRole));
        reporter.setReputationScore(100);
        reporter.setEnabled(true);

        report = new Report();
        report.setId("report-1");
        report.setReporter(reporter);
    }

    @Test
    void onReportRejected_whenCountIsLessThanFive_doesNotBanUser() {
        // Given
        when(reportRepository.countAutoRejectedReports(
                eq("user-1"),
                any(java.time.LocalDateTime.class)
        )).thenReturn(4L);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(reporter));

        // When
        citizenReputationService.onReportRejected(report, false);

        // Then
        assertThat(reporter.getSuspendedUntil()).isNull();
        verify(userRepository, times(1)).save(reporter); // for the reputation score delta update
    }

    @Test
    void onReportRejected_whenCountIsFiveOrMore_bansUser() {
        // Given
        when(reportRepository.countAutoRejectedReports(
                eq("user-1"),
                any(java.time.LocalDateTime.class)
        )).thenReturn(5L);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(reporter));

        // When
        citizenReputationService.onReportRejected(report, false);

        // Then
        assertThat(reporter.getSuspendedUntil()).isNotNull();
        // Repository save is called twice: once for reputation score delta, once for setSuspendedUntil
        verify(userRepository, atLeastOnce()).save(reporter);
    }
}
