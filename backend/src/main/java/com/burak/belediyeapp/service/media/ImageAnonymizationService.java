package com.burak.belediyeapp.service.media;

import lombok.extern.slf4j.Slf4j;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * KVKK uyumu icin yuklenen fotograflarda yuz ve plaka bolgelerini piksellestirir.
 */
@Service
@Slf4j
public class ImageAnonymizationService {

    @Value("${app.ai.gemini.key-anonymization:${app.ai.gemini.api-key:}}")
    private String apiKey;

    @Value("${app.ai.gemini.model:gemini-2.5-flash}")
    private String model;

    @Value("${app.media-anonymization.fail-open:true}")
    private boolean failOpen;

    private final RestClient http = RestClient.builder()
            .requestFactory(requestFactory())
            .build();

    public record BoundingBox(int x, int y, int width, int height) {}

    public byte[] anonymize(byte[] imageBytes, String contentType) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("your-gemini-api-key")) {
            if (failOpen) {
                return imageBytes;
            }
            throw new IllegalStateException("Anonymization API key not configured");
        }

        try {
            List<BoundingBox> boxes = detectSensitiveRegions(imageBytes, contentType);
            if (boxes.isEmpty()) {
                return imageBytes;
            }
            return pixelateRegions(imageBytes, contentType, boxes);
        } catch (Exception e) {
            if (failOpen) {
                log.warn("Gorsel anonimlestirme basarisiz oldu, orijinal gorsel korunuyor: {}", e.getMessage());
                return imageBytes;
            }
            throw new IllegalStateException("Image anonymization failed", e);
        }
    }

    private List<BoundingBox> detectSensitiveRegions(byte[] imageBytes, String contentType) {
        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        String mimeType = contentType != null ? contentType : "image/jpeg";

        String prompt = """
                Bu goruntudeki tum insan yuzlerini ve arac plakalarini tespit et.
                Kutulari normalize edilmis [0-1000] koordinat sisteminde bounding box olarak dondur.
                Yaniti yalnizca JSON formatinda ver.
                Format: {"detections": [{"type": "face"|"plate", "x": int, "y": int, "width": int, "height": int}]}
                Hicbir yuz veya plaka yoksa {"detections": []}
                """;

        JSONObject requestBody = new JSONObject()
                .put("contents", new JSONArray().put(
                        new JSONObject().put("parts", new JSONArray()
                                .put(new JSONObject()
                                        .put("inline_data", new JSONObject()
                                                .put("mime_type", mimeType)
                                                .put("data", base64)))
                                .put(new JSONObject().put("text", prompt))
                        )
                ))
                .put("generationConfig", new JSONObject().put("response_mime_type", "application/json"));

        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model
                + ":generateContent?key=" + apiKey;

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String response = http.post()
                        .uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody.toString())
                        .retrieve()
                        .body(String.class);

                return parseDetections(response);
            } catch (Exception e) {
                log.warn("Gemini yuz/plaka tespit hatasi (deneme {}): {}", attempt, e.getMessage());
            }
        }
        return List.of();
    }

    private List<BoundingBox> parseDetections(String response) {
        List<BoundingBox> boxes = new ArrayList<>();
        try {
            JSONObject json = new JSONObject(response);
            String text = json.getJSONArray("candidates")
                    .getJSONObject(0)
                    .getJSONObject("content")
                    .getJSONArray("parts")
                    .getJSONObject(0)
                    .getString("text");

            String cleanedText = text.trim();
            if (cleanedText.startsWith("```")) {
                cleanedText = cleanedText.replaceAll("^```(?:json)?|```$", "").trim();
            }
            JSONObject result = new JSONObject(cleanedText);
            JSONArray detections = result.optJSONArray("detections");
            if (detections == null) {
                return boxes;
            }
            for (int i = 0; i < detections.length(); i++) {
                JSONObject detection = detections.getJSONObject(i);
                boxes.add(new BoundingBox(
                        detection.getInt("x"),
                        detection.getInt("y"),
                        detection.getInt("width"),
                        detection.getInt("height")
                ));
            }
        } catch (Exception e) {
            log.warn("Tespit sonucu ayrıştırılamadı: {}", e.getMessage());
        }
        return boxes;
    }

    private byte[] pixelateRegions(byte[] imageBytes, String contentType, List<BoundingBox> boxes) throws Exception {
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
        if (image == null) {
            return imageBytes;
        }

        Graphics2D graphics = image.createGraphics();
        int pixelSize = Math.max(8, image.getWidth() / 80);

        for (BoundingBox box : boxes) {
            int px = (box.x() * image.getWidth()) / 1000;
            int py = (box.y() * image.getHeight()) / 1000;
            int pw = (box.width() * image.getWidth()) / 1000;
            int ph = (box.height() * image.getHeight()) / 1000;

            int x = Math.max(0, px);
            int y = Math.max(0, py);
            int width = Math.min(pw, image.getWidth() - x);
            int height = Math.min(ph, image.getHeight() - y);

            if (width <= 0 || height <= 0) {
                continue;
            }

            BufferedImage region = image.getSubimage(x, y, width, height);
            BufferedImage small = new BufferedImage(
                    Math.max(1, width / pixelSize),
                    Math.max(1, height / pixelSize),
                    image.getType() != 0 ? image.getType() : BufferedImage.TYPE_INT_RGB
            );
            Graphics2D smallGraphics = small.createGraphics();
            smallGraphics.drawImage(region, 0, 0, small.getWidth(), small.getHeight(), null);
            smallGraphics.dispose();

            graphics.drawImage(small, x, y, width, height, null);
        }
        graphics.dispose();

        String format = "jpg";
        if (contentType != null && contentType.contains("png")) {
            format = "png";
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, format, out);
        return out.toByteArray();
    }

    private static SimpleClientHttpRequestFactory requestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(30_000);
        return factory;
    }
}
