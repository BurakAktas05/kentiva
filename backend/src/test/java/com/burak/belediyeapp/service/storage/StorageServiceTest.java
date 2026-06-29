package com.burak.belediyeapp.service.storage;

import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StorageServiceTest {

    @TempDir
    Path tempDir;

    @Mock
    MediaSignedUrlService mediaSignedUrlService;

    private StorageService service;

    @BeforeEach
    void setUp() {
        service = new StorageService(mediaSignedUrlService);
        ReflectionTestUtils.setField(service, "storageType", "local");
        ReflectionTestUtils.setField(service, "localUploadDir", tempDir.toString());
    }

    @Test
    void downloadFileReadsFileInsideLocalUploadDir() throws Exception {
        Path reportsDir = tempDir.resolve("reports");
        Files.createDirectories(reportsDir);
        Files.writeString(reportsDir.resolve("ok.txt"), "ok", StandardCharsets.UTF_8);
        when(mediaSignedUrlService.persistableStoragePath("ok")).thenReturn("reports/ok.txt");

        byte[] data = service.downloadFile("ok");

        assertThat(new String(data, StandardCharsets.UTF_8)).isEqualTo("ok");
    }

    @Test
    void downloadFileRejectsPathTraversalOutsideLocalUploadDir() {
        when(mediaSignedUrlService.persistableStoragePath("bad")).thenReturn("../secret.txt");

        assertThatThrownBy(() -> service.downloadFile("bad"))
                .isInstanceOf(SecurityException.class)
                .hasMessage("Invalid storage path");
    }
}
