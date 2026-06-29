package com.burak.belediyeapp.service.media;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MediaValidationServiceTest {

    @Mock
    private RestClient restClient;

    @InjectMocks
    private MediaValidationService mediaValidationService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(mediaValidationService, "apiKey", "fake-api-key");
        ReflectionTestUtils.setField(mediaValidationService, "model", "gemini-2.5-flash");
        ReflectionTestUtils.setField(mediaValidationService, "failOpen", true);
        ReflectionTestUtils.setField(mediaValidationService, "restClient", restClient);
    }

    @Test
    void testValidateImageSafe() {
        String mockResponse = "{\n" +
                "  \"candidates\": [{\n" +
                "    \"content\": {\n" +
                "      \"parts\": [{\n" +
                "        \"text\": \"{\\\"safe\\\": true, \\\"reason\\\": \\\"\\\", \\\"code\\\": \\\"OK\\\"}\"\n" +
                "      }]\n" +
                "    }\n" +
                "  }]\n" +
                "}";

        RestClient.RequestBodyUriSpec requestBodyUriSpec = mock(RestClient.RequestBodyUriSpec.class);
        RestClient.RequestBodySpec requestBodySpec = mock(RestClient.RequestBodySpec.class);
        RestClient.ResponseSpec responseSpec = mock(RestClient.ResponseSpec.class);

        when(restClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.contentType(any())).thenReturn(requestBodySpec);
        when(requestBodySpec.body(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(String.class)).thenReturn(mockResponse);

        byte[] fakeImage = new byte[]{1, 2, 3};
        MediaValidationService.ValidationResult result = mediaValidationService.validateImage(fakeImage, "image/jpeg");

        assertThat(result.safe()).isTrue();
        assertThat(result.code()).isEqualTo("OK");
        assertThat(result.reason()).isEmpty();
    }

    @Test
    void testValidateImageUnsafeObscenity() {
        String mockResponse = "{\n" +
                "  \"candidates\": [{\n" +
                "    \"content\": {\n" +
                "      \"parts\": [{\n" +
                "        \"text\": \"{\\\"safe\\\": false, \\\"reason\\\": \\\"Müstehcen içerik tespit edildi.\\\", \\\"code\\\": \\\"OBSCENITY\\\"}\"\n" +
                "      }]\n" +
                "    }\n" +
                "  }]\n" +
                "}";

        RestClient.RequestBodyUriSpec requestBodyUriSpec = mock(RestClient.RequestBodyUriSpec.class);
        RestClient.RequestBodySpec requestBodySpec = mock(RestClient.RequestBodySpec.class);
        RestClient.ResponseSpec responseSpec = mock(RestClient.ResponseSpec.class);

        when(restClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.contentType(any())).thenReturn(requestBodySpec);
        when(requestBodySpec.body(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(String.class)).thenReturn(mockResponse);

        byte[] fakeImage = new byte[]{1, 2, 3};
        MediaValidationService.ValidationResult result = mediaValidationService.validateImage(fakeImage, "image/jpeg");

        assertThat(result.safe()).isFalse();
        assertThat(result.code()).isEqualTo("OBSCENITY");
        assertThat(result.reason()).contains("Müstehcen");
    }

    @Test
    void testValidateImageApiNotConfigured() {
        ReflectionTestUtils.setField(mediaValidationService, "apiKey", "");

        byte[] fakeImage = new byte[]{1, 2, 3};
        MediaValidationService.ValidationResult result = mediaValidationService.validateImage(fakeImage, "image/jpeg");

        assertThat(result.safe()).isTrue();
        assertThat(result.code()).isEqualTo("OK");
    }

    @Test
    void testValidateImageApiNotConfiguredFailClosed() {
        ReflectionTestUtils.setField(mediaValidationService, "apiKey", "");
        ReflectionTestUtils.setField(mediaValidationService, "failOpen", false);

        byte[] fakeImage = new byte[]{1, 2, 3};
        MediaValidationService.ValidationResult result = mediaValidationService.validateImage(fakeImage, "image/jpeg");

        assertThat(result.safe()).isFalse();
        assertThat(result.code()).isEqualTo("UNAVAILABLE");
    }
}
