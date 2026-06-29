package com.burak.belediyeapp.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class CorrelationIdFilterTest {

    private final CorrelationIdFilter filter = new CorrelationIdFilter();

    @Test
    void generatesFreshIdWhenIncomingHeaderIsUnsafe() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.addHeader("X-Correlation-ID", "%%%bad%%%");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        String responseId = response.getHeader("X-Correlation-ID");
        assertThat(responseId).isNotBlank();
        assertThat(responseId).isNotEqualTo("%%%bad%%%");
        assertThat(response.getHeader("X-Request-ID")).isEqualTo(responseId);
        assertThat(response.getHeader("Cache-Control")).contains("no-store");
    }

    @Test
    void preservesSafeIncomingCorrelationId() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/reports/my");
        request.addHeader("X-Correlation-ID", "req-2026.prod.abc123");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader("X-Correlation-ID")).isEqualTo("req-2026.prod.abc123");
        assertThat(response.getHeader("Cache-Control")).isNull();
    }
}
