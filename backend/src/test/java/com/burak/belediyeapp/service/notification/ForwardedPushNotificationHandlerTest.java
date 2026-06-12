package com.burak.belediyeapp.service.notification;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Notification;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.INotificationRepository;
import com.burak.belediyeapp.service.notification.channel.ForwardedPushNotificationHandler;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ForwardedPushNotificationHandlerTest {

    @Mock
    private INotificationRepository notificationRepository;

    @Mock
    private MunicipalityMessageService municipalityMessageService;

    @Mock
    private FirebasePushClient firebasePushClient;

    @InjectMocks
    private ForwardedPushNotificationHandler handler;

    @Test
    void supportsOnlyForwardedStatus() {
        assertThat(handler.supports(ReportStatus.FORWARDED)).isTrue();
        assertThat(handler.supports(ReportStatus.PENDING)).isFalse();
        assertThat(handler.supports(ReportStatus.PROCESSING)).isFalse();
        assertThat(handler.supports(ReportStatus.RESOLVED)).isFalse();
    }

    @Test
    void deliverSavesNotificationAndSendsPush() {
        AppUser reporter = new AppUser();
        reporter.setId("reporter-1");
        reporter.setFcmToken("token-xyz");

        Report report = new Report();
        report.setId("report-1");
        report.setTitle("Title");
        report.setContentLanguage("tr");

        when(municipalityMessageService.buildForwardedPush(any(), any(), any(), any()))
                .thenReturn(new MunicipalityMessageService.PushMessage("Başlık", "Gövde"));

        handler.deliver(reporter, report, "Note");

        verify(notificationRepository).save(any(Notification.class));
        verify(firebasePushClient).send(eq("token-xyz"), eq("Başlık"), eq("Gövde"), eq(Map.of("reportId", "report-1", "type", "REPORT_FORWARDED")));
    }
}
