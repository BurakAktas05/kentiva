package com.burak.belediyeapp.service.media;

import com.burak.belediyeapp.exception.BusinessException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.Locale;
import java.util.Set;

/**
 * Uploads must be real raster images (JPEG/PNG/WebP). Content-Type alone is
 * not trusted — SVG and polyglots are rejected via magic bytes + ImageIO decode.
 */
public final class ImageContentValidator {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );

    private ImageContentValidator() {}

    public record ValidatedImage(String contentType) {}

    public static ValidatedImage validateOrThrow(byte[] bytes, String declaredContentType) {
        if (bytes == null || bytes.length < 12) {
            throw new BusinessException("Geçersiz görüntü dosyası.", "INVALID_MEDIA");
        }

        String sniffed = sniffMime(bytes);
        if (sniffed == null) {
            throw new BusinessException(
                    "Yalnızca JPEG, PNG veya WebP görüntüleri yüklenebilir.",
                    "INVALID_MEDIA_TYPE");
        }

        if (declaredContentType != null && !declaredContentType.isBlank()) {
            String declared = declaredContentType.toLowerCase(Locale.ROOT).split(";")[0].trim();
            if ("image/svg+xml".equals(declared) || declared.contains("svg")) {
                throw new BusinessException("SVG dosyaları kabul edilmez.", "INVALID_MEDIA_TYPE");
            }
            if (!ALLOWED_TYPES.contains(declared) && !declared.equals(sniffed)
                    && !(declared.equals("image/jpg") && sniffed.equals("image/jpeg"))) {
                // Declared type may be wrong; sniffed type wins if it is allowed.
                if (!ALLOWED_TYPES.contains(sniffed)) {
                    throw new BusinessException(
                            "Yalnızca JPEG, PNG veya WebP görüntüleri yüklenebilir.",
                            "INVALID_MEDIA_TYPE");
                }
            }
        }

        // WebP: ImageIO may lack a reader; magic bytes are sufficient.
        if ("image/webp".equals(sniffed)) {
            return new ValidatedImage("image/webp");
        }

        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image == null || image.getWidth() < 1 || image.getHeight() < 1) {
                throw new BusinessException("Görüntü dosyası okunamadı.", "INVALID_MEDIA");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("Görüntü dosyası okunamadı.", "INVALID_MEDIA");
        }

        return new ValidatedImage(sniffed);
    }

    private static String sniffMime(byte[] bytes) {
        // JPEG
        if (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF) {
            return "image/jpeg";
        }
        // PNG
        if (bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
                && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A) {
            return "image/png";
        }
        // WebP: RIFF....WEBP
        if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "image/webp";
        }
        // Reject SVG / XML looking payloads even if Content-Type claimed image/*
        String head = new String(bytes, 0, Math.min(bytes.length, 256), java.nio.charset.StandardCharsets.UTF_8)
                .trim()
                .toLowerCase(Locale.ROOT);
        if (head.startsWith("<?xml") || head.startsWith("<svg") || head.contains("<svg")) {
            return null;
        }
        return null;
    }
}
