package com.burak.belediyeapp.service.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Dosya depolama servisi.
 * S3/R2 veya yerel dosya sistemi kullanır.
 * app.storage.type=local ise yerel dosya sistemine yazar.
 */
@Service
@Slf4j
public class StorageService {

    @Autowired(required = false)
    private S3Client s3Client;

    @Value("${app.storage.s3.bucket-name:belediye-reports}")
    private String bucketName;

    @Value("${app.storage.s3.public-url:http://localhost:8080/uploads}")
    private String publicUrl;

    @Value("${app.storage.type:s3}")
    private String storageType;

    @Value("${app.storage.local.upload-dir:uploads}")
    private String localUploadDir;

    /**
     * Yerel depoda dönen göreli /uploads/... yolunu, ngrok vb. için tam URL'ye çevirir (boşsa göreli kalır).
     */
    @Value("${app.public-base-url:}")
    private String publicBaseUrl;

    /**
     * Dosyayı depolamaya yükler ve erişim URL'ini döner.
     */
    public String uploadFile(MultipartFile file, String folder) {
        if ("local".equals(storageType) || s3Client == null) {
            return uploadToLocalFs(file, folder);
        }
        return uploadToS3(file, folder);
    }

    public String uploadBytes(byte[] data, String contentType, String folder, String originalFilename) {
        String safeName = originalFilename != null ? originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_") : "upload.bin";
        String fileName = folder + "/" + UUID.randomUUID() + "_" + safeName;

        if ("local".equals(storageType) || s3Client == null) {
            return uploadBytesToLocalFs(data, fileName);
        }
        return uploadBytesToS3(data, contentType, fileName);
    }

    public void deleteFile(String fileUrl) {
        if ("local".equals(storageType) || s3Client == null) {
            log.info("Yerel dosya silme istendi: {}", fileUrl);
            return;
        }
        try {
            String key = fileUrl.replace(publicUrl + "/", "");
            s3Client.deleteObject(builder -> builder.bucket(bucketName).key(key));
            log.info("Dosya silindi: {}", key);
        } catch (Exception e) {
            log.warn("Dosya silinirken hata oluştu (önemsiz olabilir): {}", fileUrl);
        }
    }

    // ── S3 Yüklemeleri ───────────────────────────

    private String uploadToS3(MultipartFile file, String folder) {
        String safeName = file.getOriginalFilename() != null
                ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_")
                : "upload.bin";
        String fileName = folder + "/" + UUID.randomUUID() + "_" + safeName;
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType(file.getContentType())
                    .build();
            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            log.info("Dosya S3'e yüklendi: {}", fileName);
            return publicUrl + "/" + fileName;
        } catch (IOException e) {
            log.error("S3 dosya yükleme hatası: {}", fileName, e);
            throw new RuntimeException("Dosya yüklenemedi", e);
        }
    }

    private String uploadBytesToS3(byte[] data, String contentType, String fileName) {
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType(contentType != null ? contentType : "application/octet-stream")
                    .build();
            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(data));
            log.info("Dosya S3'e yüklendi (bytes): {}", fileName);
            return publicUrl + "/" + fileName;
        } catch (Exception e) {
            log.error("S3 dosya yükleme hatası: {}", fileName, e);
            throw new RuntimeException("Dosya yüklenemedi", e);
        }
    }

    // ── Local FS Yüklemeleri ─────────────────────

    private String uploadToLocalFs(MultipartFile file, String folder) {
        String safeName = file.getOriginalFilename() != null
                ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_")
                : "upload.bin";
        String fileName = folder + "/" + UUID.randomUUID() + "_" + safeName;
        try {
            Path path = Paths.get(localUploadDir, fileName);
            Files.createDirectories(path.getParent());
            Files.write(path, file.getBytes());
            log.info("Dosya yerel diske kaydedildi: {}", path);
            return absolutizeLocalPublicUrl("/uploads/" + fileName);
        } catch (IOException e) {
            log.error("Yerel dosya yükleme hatası: {}", fileName, e);
            throw new RuntimeException("Dosya yüklenemedi", e);
        }
    }

    private String uploadBytesToLocalFs(byte[] data, String fileName) {
        try {
            Path path = Paths.get(localUploadDir, fileName);
            Files.createDirectories(path.getParent());
            Files.write(path, data);
            log.info("Dosya yerel diske kaydedildi (bytes): {}", path);
            return absolutizeLocalPublicUrl("/uploads/" + fileName);
        } catch (IOException e) {
            log.error("Yerel dosya yükleme hatası: {}", fileName, e);
            throw new RuntimeException("Dosya yüklenemedi", e);
        }
    }

    private String absolutizeLocalPublicUrl(String relativePath) {
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            return relativePath;
        }
        String base = publicBaseUrl.trim().replaceAll("/+$", "");
        return base + relativePath;
    }
}
