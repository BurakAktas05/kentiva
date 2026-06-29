package com.burak.belediyeapp.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SsrfProtectionInterceptorTest {

    @Test
    void validatePublicHttpUriAllowsPublicIp() {
        assertThatCode(() -> SsrfProtectionInterceptor.validatePublicHttpUri("https://1.1.1.1/webhook"))
                .doesNotThrowAnyException();
    }

    @Test
    void validatePublicHttpUriRejectsLoopbackIp() {
        assertThatThrownBy(() -> SsrfProtectionInterceptor.validatePublicHttpUri("https://127.0.0.1/webhook"))
                .isInstanceOf(java.io.IOException.class)
                .hasMessageContaining("Blocked");
    }
}
