package com.burak.belediyeapp.service.sms;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class SmsOtpServiceTest {

    private SmsOtpService smsOtpService;

    @BeforeEach
    void setUp() {
        smsOtpService = new SmsOtpService();
        ReflectionTestUtils.setField(smsOtpService, "provider", "none");
    }

    @Test
    void formatPhoneForSms_normalizesTurkishMobile() {
        assertThat(smsOtpService.formatPhoneForSms("0555 123 45 67")).isEqualTo("905551234567");
        assertThat(smsOtpService.formatPhoneForSms("+90 555 123 45 67")).isEqualTo("905551234567");
        assertThat(smsOtpService.formatPhoneForSms("5551234567")).isEqualTo("905551234567");
    }

    @Test
    void sendNotification_returnsFalseWhenPhoneMissing() {
        assertThat(smsOtpService.sendNotification(null, "test")).isFalse();
        assertThat(smsOtpService.sendNotification("  ", "test")).isFalse();
    }
}
