package com.burak.belediyeapp.service.media;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ImageAnonymizationServiceTest {

    private ImageAnonymizationService service;
    private RestClient.ResponseSpec responseSpec;

    @BeforeEach
    void setUp() {
        service = new ImageAnonymizationService();
        ReflectionTestUtils.setField(service, "apiKey", "fake-api-key");
        ReflectionTestUtils.setField(service, "model", "gemini-2.5-flash");

        RestClient restClient = mock(RestClient.class);
        RestClient.RequestBodyUriSpec requestBodyUriSpec = mock(RestClient.RequestBodyUriSpec.class);
        RestClient.RequestBodySpec requestBodySpec = mock(RestClient.RequestBodySpec.class);
        responseSpec = mock(RestClient.ResponseSpec.class);

        when(restClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.contentType(any(MediaType.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.body(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        ReflectionTestUtils.setField(service, "http", restClient);
    }

    @Test
    void returnsOriginalImageForValidEmptyDetectionResponse() {
        ReflectionTestUtils.setField(service, "failOpen", false);
        when(responseSpec.body(String.class)).thenReturn("""
                {"candidates":[{"content":{"parts":[{"text":"{\\"detections\\":[]}"}]}}]}
                """);
        byte[] image = new byte[]{1, 2, 3};

        assertThat(service.anonymize(image, "image/jpeg")).isSameAs(image);
    }

    @Test
    void rejectsMalformedDetectionResponseWhenFailClosed() {
        ReflectionTestUtils.setField(service, "failOpen", false);
        when(responseSpec.body(String.class)).thenReturn("{\"candidates\":[]}");

        assertThatIllegalStateException()
                .isThrownBy(() -> service.anonymize(new byte[]{1, 2, 3}, "image/jpeg"))
                .withMessageContaining("Image anonymization failed");
    }

    @Test
    void preservesOriginalImageOnMalformedResponseOnlyWhenFailOpen() {
        ReflectionTestUtils.setField(service, "failOpen", true);
        when(responseSpec.body(String.class)).thenReturn("{\"candidates\":[]}");
        byte[] image = new byte[]{1, 2, 3};

        assertThat(service.anonymize(image, "image/jpeg")).isSameAs(image);
    }
}
