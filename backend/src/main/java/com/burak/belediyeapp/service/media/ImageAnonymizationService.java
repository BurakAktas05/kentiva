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
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * KVKK uyumu — yüklenen fotoğraflarda yüz ve plaka tespiti yaparak
 * bu bölgeleri pikselleştirir (blur). Google Gemini multimodal API kullanır.
 *
 * Gemini erişilemezse veya API key yoksa orijinal baytlar olduğu gibi döner (fail-open).
 */
@Service
@Slf4j
public class ImageAnonymizationService {

    @Value("${app.ai.gemini.key-anonymization:${app.ai.gemini.api-key:}}")
    private String apiKey;

    @Value("${app.ai.gemini.model:gemini-2.5-flash}")
    private String model;

    private final RestClient http = RestClient.builder()
            .requestFactory(requestFactory())
            .build();

    public record BoundingBox(int x, int y, int width, int height) {}

    /**
     * Görüntüyü analiz edip tespit edilen yüz ve plaka bölgelerini pikselleştirir.
     *
     * @param imageBytes   orijinal görüntü baytları
     * @param contentType  MIME türü (image/jpeg, image/png vb.)
     * @return anonimleştirilmiş görüntü baytları
     */
    public byte[] anonymize(byte[] imageBytes, String contentType) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("your-gemini-api-key")) {
            return imageBytes;
        }

        try {
            List<BoundingBox> boxes = detectSensitiveRegions(imageBytes, contentType);
            if (boxes.isEmpty()) {
                return imageBytes;
            }
            return pixelateRegions(imageBytes, contentType, boxes);
        } catch (Exception e) {
            log.warn("Görüntü anonimleştirme başarısız — orijinal kullanılacak: {}", e.getMessage());
            return imageBytes;
        }
    }

    private List<BoundingBox> detectSensitiveRegions(byte[] imageBytes, String contentType) {
        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        String mimeType = contentType != null ? contentType : "image/jpeg";

        String prompt = """
                Bu görüntüdeki tüm insan yüzlerini ve araç plakalarını tespit et.
                Her tespit için piksel cinsinden sınırlayıcı kutu (bounding box) bilgisi döndür.
                Yanıtı yalnızca JSON formatında ver, başka metin ekleme.
                Format: {"detections": [{"type": "face"|"plate", "x": int, "y": int, "width": int, "height": int}]}
                Hiçbir yüz veya plaka yoksa: {"detections": []}
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
                log.warn("Gemini yüz/plaka tespit hatası (deneme {}): {}", attempt, e.getMessage());
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

            JSONObject result = new JSONObject(text);
            JSONArray detections = result.optJSONArray("detections");
            if (detections == null) {
                return boxes;
            }
            for (int i = 0; i < detections.length(); i++) {
                JSONObject d = detections.getJSONObject(i);
                boxes.add(new BoundingBox(
                        d.getInt("x"), d.getInt("y"),
                        d.getInt("width"), d.getInt("height")
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

        Graphics2D g = image.createGraphics();
        int pixelSize = Math.max(8, image.getWidth() / 80); // dinamik piksel boyutu

        for (BoundingBox box : boxes) {
            int x = Math.max(0, box.x());
            int y = Math.max(0, box.y());
            int w = Math.min(box.width(), image.getWidth() - x);
            int h = Math.min(box.height(), image.getHeight() - y);

            if (w <= 0 || h <= 0) continue;

            // Pikselleştirme: küçült ve geri büyüt
            BufferedImage region = image.getSubimage(x, y, w, h);
            BufferedImage small = new BufferedImage(
                    Math.max(1, w / pixelSize),
                    Math.max(1, h / pixelSize),
                    image.getType() != 0 ? image.getType() : BufferedImage.TYPE_INT_RGB
            );
            Graphics2D gs = small.createGraphics();
            gs.drawImage(region, 0, 0, small.getWidth(), small.getHeight(), null);
            gs.dispose();

            g.drawImage(small, x, y, w, h, null);
        }
        g.dispose();

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
