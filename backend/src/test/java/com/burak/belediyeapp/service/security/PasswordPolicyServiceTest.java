package com.burak.belediyeapp.service.security;

import com.burak.belediyeapp.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyServiceTest {

    private PasswordPolicyService service;

    @BeforeEach
    void setUp() {
        service = new PasswordPolicyService();
        ReflectionTestUtils.setField(service, "citizenMinLength", 10);
        ReflectionTestUtils.setField(service, "privilegedMinLength", 12);
        ReflectionTestUtils.setField(service, "maxLength", 128);
    }

    @Test
    void rejectsCitizenPasswordContainingEmailHint() {
        assertThatThrownBy(() -> service.validateCitizenPassword(
                "Murat2026X",
                "murat@example.com",
                "Murat",
                "Yilmaz"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ad, soyad veya e-posta");
    }

    @Test
    void rejectsPasswordWithoutDigits() {
        assertThatThrownBy(() -> service.validatePrivilegedPassword(
                "GucluSifreXyz",
                "admin@example.com",
                "Admin",
                "User"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("en az bir harf ve bir rakam");
    }

    @Test
    void generatesPrivilegedPasswordMeetingPolicy() {
        String generated = service.generateStrongPassword(16, true);

        service.validatePrivilegedPassword(generated, "yonetici@example.com", "Yonetici", "Kullanici");
        assertThat(generated).hasSizeGreaterThanOrEqualTo(16);
    }
}
