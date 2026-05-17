package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.INotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock CitizenNotificationDispatcher citizenNotificationDispatcher;
    @Mock INotificationRepository notificationRepository;
    @Mock FirebasePushClient firebasePushClient;

    @InjectMocks NotificationService notificationService;

    private Report report;

    @BeforeEach
    void setUp() {
        report = new Report();
        report.setId("report-1");
        report.setTitle("Test");
        report.setReportStatus(ReportStatus.RESOLVED);
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

        notificationService.notifyReportAssigned(report, assignee);

        verify(notificationRepository).save(any());
        verify(firebasePushClient).send(any(), any(), any(), any());
        verifyNoInteractions(citizenNotificationDispatcher);
    }
}
