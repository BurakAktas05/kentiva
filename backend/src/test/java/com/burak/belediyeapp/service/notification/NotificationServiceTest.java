package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.INotificationRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock CitizenNotificationDispatcher citizenNotificationDispatcher;
    @Mock INotificationRepository notificationRepository;
    @Mock IReportRepository reportRepository;
    @Mock IAppUserRepository userRepository;
    @Mock FirebasePushClient firebasePushClient;
    @Mock MunicipalityMessageService municipalityMessageService;

    @InjectMocks NotificationService notificationService;

    private Report report;

    @BeforeEach
    void setUp() {
        report = new Report();
        report.setId("report-1");
        report.setTitle("Test");
        report.setReportStatus(ReportStatus.RESOLVED);

        // @Lazy self-injection — testte aynı instance ile değiştir.
        try {
            java.lang.reflect.Field selfField = NotificationService.class.getDeclaredField("self");
            selfField.setAccessible(true);
            selfField.set(notificationService, notificationService);
        } catch (Exception ignored) {
            // self alanı eksikse: testin manuel notify metodu hata verecek
        }
    }

    @Test
    void notifyReportStatusChanged_delegatesToDispatcher() {
        notificationService.notifyReportStatusChanged(report);
        verify(citizenNotificationDispatcher).dispatchReportStatusChanged(report);
    }

    @Test
    void notifyReportAssigned_sendsPushToAssignee() {
        AppUser assignee = new AppUser();
        assignee.setId("officer-1");
        assignee.setFcmToken("fcm-token");

        // notifyReportAssigned ID üzerinden yeniden çeker → mockları hazırla.
        when(reportRepository.findByIdWithMunicipality("report-1")).thenReturn(Optional.of(report));
        when(userRepository.findById("officer-1")).thenReturn(Optional.of(assignee));
        when(municipalityMessageService.buildAssignedPush(any(), any(), any()))
                .thenReturn(new MunicipalityMessageService.PushMessage("Atandı", "Test gövde"));

        notificationService.notifyReportAssigned(report, assignee);

        verify(notificationRepository).save(any());
        verify(firebasePushClient).send(any(), any(), any(), any());
        verifyNoInteractions(citizenNotificationDispatcher);
    }
}
