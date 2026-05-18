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
@Order(10)
@RequiredArgsConstructor
@Slf4j
public class ResolvedSmsNotificationHandler implements ReportStatusNotificationHandler {

    private final SmsOtpService smsOtpService;
    private final MunicipalityMessageService municipalityMessageService;

    @Value("${app.sms.notify-on-report-resolved:true}")
    private boolean smsEnabled;

    @Override
    public boolean supports(ReportStatus status) {
        return status == ReportStatus.RESOLVED;
    }

    @Override
    public void deliver(AppUser reporter, Report report, String staffNote) {
        if (!smsEnabled) {
            return;
        }
        String phone = reporter.getPhoneNumber();
        if (phone == null || phone.isBlank()) {
            log.info("Çözüm SMS atlandı (telefon yok): rapor={}", report.getId());
            return;
        }
        String smsBody = municipalityMessageService.buildResolvedSms(
                report.getMunicipality(), report.getTitle(), staffNote, report.getContentLanguage());
        String senderHeader = municipalityMessageService.resolveSmsSenderHeader(report.getMunicipality());
        boolean sent = smsOtpService.sendNotification(phone, smsBody, senderHeader);
        if (sent) {
            log.info("Çözüm SMS gönderildi: rapor={}", report.getId());
        } else {
            log.warn("Çözüm SMS gönderilemedi: rapor={}", report.getId());
        }
    }
}
