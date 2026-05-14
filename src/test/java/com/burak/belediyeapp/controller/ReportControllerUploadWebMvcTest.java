package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.service.media.MediaGuardClient;
import com.burak.belediyeapp.service.report.ReportService;
import com.burak.belediyeapp.service.auth.JwtService;
import com.burak.belediyeapp.service.storage.StorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReportControllerUploadWebMvcTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean ReportService reportService;
    @MockitoBean StorageService storageService;
    @MockitoBean MediaGuardClient mediaGuardClient;
    @MockitoBean JwtService jwtService;
    @MockitoBean IAppUserRepository userRepository;

    @Test
    void imageUploadValidatesMediaAndReturnsStoredUrl() throws Exception {
        MockMultipartFile file = new MockMultipartFile("files", "photo.jpg", "image/jpeg", new byte[] {1, 2, 3});
        when(storageService.uploadBytes(any(), eq("image/jpeg"), eq("reports"), eq("photo.jpg")))
                .thenReturn("https://cdn.example.com/photo.jpg");

        mockMvc.perform(multipart("/api/v1/reports/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0]").value("https://cdn.example.com/photo.jpg"));

        verify(mediaGuardClient).validateImageOrThrow(any(), eq("image/jpeg"));
    }

    @Test
    void nonImageUploadReturnsValidationError() throws Exception {
        MockMultipartFile file = new MockMultipartFile("files", "note.txt", "text/plain", "hello".getBytes());

        mockMvc.perform(multipart("/api/v1/reports/upload").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_MEDIA_TYPE"));
    }
}
