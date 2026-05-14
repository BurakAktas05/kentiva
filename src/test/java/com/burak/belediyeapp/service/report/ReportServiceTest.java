package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.request.report.UpdateReportStatusRequest;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.mapper.IReportMapper;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IReportHistoryRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.ai.GeminiService;
import com.burak.belediyeapp.service.geo.DistrictResolutionService;
import com.burak.belediyeapp.service.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.context.ApplicationEventPublisher;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock IReportRepository reportRepository;
    @Mock IReportCategoryRepository categoryRepository;
    @Mock IAppUserRepository userRepository;
    @Mock IReportHistoryRepository historyRepository;
    @Mock IReportMapper reportMapper;
    @Mock NotificationService notificationService;
    @Mock GeminiService geminiService;
    @Mock DistrictResolutionService districtResolutionService;
    @Mock IMunicipalityRepository municipalityRepository;
    @Mock ApplicationEventPublisher eventPublisher;

    @InjectMocks ReportService reportService;

    @Test
    void staffCannotReadReportFromAnotherMunicipality() {
        Report report = report("report-1", "municipality-a", ReportStatus.PENDING);
        AppUser admin = user("admin-1", "ROLE_ADMIN", "municipality-b");
        when(reportRepository.findById("report-1")).thenReturn(Optional.of(report));

        assertThatThrownBy(() -> reportService.getReportById("report-1", admin))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Bu rapora erişim yetkiniz yok");
    }

    @Test
    void statusUpdatePersistsHistoryAndNotifiesReporterWhenInScope() {
        Report report = report("report-1", "municipality-a", ReportStatus.PENDING);
        AppUser admin = user("admin-1", "ROLE_ADMIN", "municipality-a");
        UpdateReportStatusRequest request = new UpdateReportStatusRequest(ReportStatus.PROCESSING, "Saha ekibine alındı");
        ReportResponse response = new ReportResponse(
                "report-1", "Başlık", "Açıklama", "PROCESSING", "Kategori", "Muhabir", null,
                41.0, 29.0, null, null, java.util.List.of(), "İlçe",
                null, null, null, null, null, null
        );

        when(reportRepository.findById("report-1")).thenReturn(Optional.of(report));
        when(reportRepository.save(report)).thenReturn(report);
        when(reportMapper.toResponse(report)).thenReturn(response);

        reportService.updateReportStatus("report-1", request, admin);

        verify(historyRepository).save(any());
        verify(notificationService).notifyReportStatusChanged(report);
        verify(reportRepository).save(report);
    }

    private Report report(String id, String municipalityId, ReportStatus status) {
        Municipality municipality = new Municipality();
        municipality.setId(municipalityId);

        AppUser reporter = user("citizen-1", "ROLE_CITIZEN", municipalityId);

        Report report = new Report();
        report.setId(id);
        report.setMunicipality(municipality);
        report.setReporter(reporter);
        report.setReportStatus(status);
        return report;
    }

    private AppUser user(String id, String roleName, String municipalityId) {
        Municipality municipality = new Municipality();
        municipality.setId(municipalityId);

        Role role = new Role();
        role.setName(roleName);

        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail(id + "@example.com");
        user.setMunicipality(municipality);
        user.setRoles(Set.of(role));
        return user;
    }
}
