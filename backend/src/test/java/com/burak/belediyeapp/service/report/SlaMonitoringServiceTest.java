package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.INotificationRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.notification.FirebasePushClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SlaMonitoringServiceTest {

    @Mock
    private IReportRepository reportRepository;

    @Mock
    private IAppUserRepository userRepository;

    @Mock
    private INotificationRepository notificationRepository;

    @Mock
    private FirebasePushClient firebasePushClient;

    @InjectMocks
    private SlaMonitoringService slaMonitoringService;

    @BeforeEach
    void wireSelf() {
        ReflectionTestUtils.setField(slaMonitoringService, "self", slaMonitoringService);
    }

    @Test
    void whenProcessingReportSlaNotBreachedBasedOnProcessedAt() {
        Report report = new Report();
        report.setId("report-1");
        report.setReportStatus(ReportStatus.PROCESSING);
        report.setAiPriority("MEDIUM");
        report.setCreatedAt(LocalDateTime.now().minusHours(80));
        report.setProcessedAt(LocalDateTime.now().minusHours(24));
        report.setSlaBreached(false);

        when(reportRepository.findUnresolvedReportsNotSlaBreached(any(), any(Pageable.class)))
                .thenReturn(Collections.singletonList(report));

        slaMonitoringService.checkSlaBreaches();

        assertThat(report.isSlaBreached()).isFalse();
        verify(reportRepository, never()).save(any());
    }

    @Test
    void whenProcessingReportSlaBreachedBasedOnProcessedAt() {
        Report report = new Report();
        report.setId("report-1");
        report.setReportStatus(ReportStatus.PROCESSING);
        report.setAiPriority("MEDIUM");
        report.setCreatedAt(LocalDateTime.now().minusHours(100));
        report.setProcessedAt(LocalDateTime.now().minusHours(73));
        report.setSlaBreached(false);

        Municipality municipality = new Municipality();
        municipality.setId("muni-1");
        report.setMunicipality(municipality);

        when(reportRepository.findUnresolvedReportsNotSlaBreached(any(), any(Pageable.class)))
                .thenReturn(Collections.singletonList(report))
                .thenReturn(Collections.emptyList());
        when(reportRepository.findByIdForRealtimePush("report-1")).thenReturn(Optional.of(report));
        when(reportRepository.save(report)).thenReturn(report);
        when(userRepository.findAllByRoles_NameAndMunicipalityId(anyString(), eq("muni-1")))
                .thenReturn(Collections.emptyList());

        slaMonitoringService.checkSlaBreaches();

        assertThat(report.isSlaBreached()).isTrue();
        verify(reportRepository, times(1)).save(report);
    }
}
