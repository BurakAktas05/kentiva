package com.burak.belediyeapp.security;

import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.method.HandlerMethod;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class RateLimitInterceptorTest {

    private final RateLimitInterceptor interceptor =
            new RateLimitInterceptor(
                    mock(IMunicipalityRepository.class),
                    new ObjectMapper().registerModule(new JavaTimeModule()));

    @Test
    void annotatedEndpointPublishesHeadersAndRejectsOverflow() throws Exception {
        HandlerMethod handlerMethod = new HandlerMethod(
                new RateLimitedController(),
                RateLimitedController.class.getDeclaredMethod("limitedEndpoint")
        );

        MockHttpServletRequest firstRequest = new MockHttpServletRequest("GET", "/api/v1/test");
        firstRequest.addHeader("X-Api-Key", "municipality-secret-key");
        MockHttpServletResponse firstResponse = new MockHttpServletResponse();

        boolean firstAllowed = interceptor.preHandle(firstRequest, firstResponse, handlerMethod);

        assertThat(firstAllowed).isTrue();
        assertThat(firstResponse.getHeader("X-RateLimit-Limit")).isEqualTo("1");
        assertThat(firstResponse.getHeader("X-RateLimit-Remaining")).isEqualTo("0");
        assertThat(firstResponse.getHeader("X-RateLimit-Reset")).isNotBlank();
        assertThat(firstResponse.getHeader("Retry-After")).isNull();

        MockHttpServletRequest secondRequest = new MockHttpServletRequest("GET", "/api/v1/test");
        secondRequest.addHeader("X-Api-Key", "municipality-secret-key");
        MockHttpServletResponse secondResponse = new MockHttpServletResponse();

        boolean secondAllowed = interceptor.preHandle(secondRequest, secondResponse, handlerMethod);

        assertThat(secondAllowed).isFalse();
        assertThat(secondResponse.getStatus()).isEqualTo(429);
        assertThat(secondResponse.getHeader("X-RateLimit-Limit")).isEqualTo("1");
        assertThat(secondResponse.getHeader("X-RateLimit-Remaining")).isEqualTo("0");
        assertThat(secondResponse.getHeader("X-RateLimit-Reset")).isNotBlank();
        assertThat(secondResponse.getHeader("Retry-After")).isNotBlank();
        assertThat(secondResponse.getContentAsString()).contains("RATE_LIMIT_EXCEEDED");
    }

    @Test
    void explicitlyDisabledRateLimitPassesThroughWithoutHeaders() throws Exception {
        ReflectionTestUtils.setField(interceptor, "enabled", false);
        HandlerMethod handlerMethod = new HandlerMethod(
                new RateLimitedController(),
                RateLimitedController.class.getDeclaredMethod("limitedEndpoint")
        );
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/test");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, handlerMethod);

        assertThat(allowed).isTrue();
        assertThat(response.getHeader("X-RateLimit-Limit")).isNull();
        assertThat(response.getContentAsString()).isEmpty();
    }

    static class RateLimitedController {
        @RateLimit(requests = 1, window = 60)
        public void limitedEndpoint() {
        }
    }
}
