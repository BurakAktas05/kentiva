package com.burak.belediyeapp.service.notification.channel;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.service.notification.MunicipalityMessageService;
import com.burak.belediyeapp.service.sms.SmsOtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(12)
@RequiredArgsConstructor
@Slf4j
public class ProcessingSmsNotificationHandler implements ReportStatusNotificationHandler {

    private final SmsOtpService smsOtpService;
    private final MunicipalityMessageService municipalityMessageService;

    @Value("${app.sms.notify-on-report-processing:false}")
    private boolean smsEnabled;

    @Override
    public boolean supports(ReportStatus status) {
        return status == ReportStatus.PROCESSING;
    }

    @Override
    public void deliver(AppUser reporter, Report report, String staffNote) {
        if (!smsEnabled) {
            return;
        }
        String phone = reporter.getPhoneNumber();
        if (phone == null || phone.isBlank()) {
            return;
        }
        String smsBody = municipalityMessageService.buildProcessingSms(
                report.getMunicipality(), report.getTitle(), staffNote, report.getContentLanguage());
        String senderHeader = municipalityMessageService.resolveSmsSenderHeader(report.getMunicipality());
        boolean sent = smsOtpService.sendNotification(phone, smsBody, senderHeader);
        if (!sent) {
            log.warn("İşlemde SMS gönderilemedi: rapor={}", report.getId());
        }
    }
}
