package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Yerel diskteki medya dosyalarını süre sınırlı imzalı token ile sunar.
 */
@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
@Tag(name = "Medya", description = "Güvenli medya erişimi")
public class MediaController {

    private final MediaSignedUrlService mediaSignedUrlService;

    @Value("${app.storage.local.upload-dir:uploads}")
    private String localUploadDir;

    @GetMapping("/access")
    @Operation(summary = "İmzalı medya token ile dosya indir")
    public ResponseEntity<Resource> access(@RequestParam("token") String token) {
        String storageKey = mediaSignedUrlService.verifyAndExtractPath(token);
        if (storageKey.contains("..")) {
            throw new BusinessException("Geçersiz dosya yolu.", "INVALID_MEDIA_PATH");
        }

        Path filePath = Paths.get(localUploadDir, storageKey).normalize();
        Path root = Paths.get(localUploadDir).toAbsolutePath().normalize();
        if (!filePath.toAbsolutePath().normalize().startsWith(root)) {
            throw new BusinessException("Geçersiz dosya yolu.", "INVALID_MEDIA_PATH");
        }
        if (!Files.isRegularFile(filePath)) {
            throw new BusinessException("Medya bulunamadı.", "MEDIA_NOT_FOUND");
        }

        Resource resource = new FileSystemResource(filePath);
        String contentType = mediaSignedUrlService.guessContentType(storageKey);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }
}
