package com.burak.belediyeapp.service.transit;

import com.burak.belediyeapp.dto.response.transit.BusRouteDto;
import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.*;
import com.burak.belediyeapp.service.ai.GeminiService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusRouteService {

    private final IBusRouteRepository busRouteRepository;
    private final IStarredRouteRepository starredRouteRepository;
    private final IStarredStopRepository starredStopRepository;
    private final IMunicipalityRepository municipalityRepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    @Value("${app.ai.gemini.api-key:}")
    private String geminiApiKey;

    // ──────────────────────────────────────────────────────────────────
    // IMPORT FROM FILES (PDF / Excel / TXT)
    // ──────────────────────────────────────────────────────────────────

    @Transactional
    public void importRoutes(String municipalityId, List<MultipartFile> files) {
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new BusinessException("Belediye bulunamadı", "MUNICIPALITY_NOT_FOUND"));

        if (files == null || files.isEmpty() || files.stream().allMatch(MultipartFile::isEmpty)) {
            throw new BusinessException(
                    "İçe aktarılacak dosya seçilmedi. Lütfen en az bir PDF, Excel veya TXT dosyası yükleyin.",
                    "NO_FILES_PROVIDED");
        }

        List<JSONArray> allRoutesLists = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            String filename = file.getOriginalFilename();
            if (filename == null) continue;

            try {
                if (filename.toLowerCase().endsWith(".pdf")) {
                    byte[] pdfBytes = file.getBytes();
                    String extractedText = null;
                    try (InputStream is = file.getInputStream()) {
                        extractedText = extractTextFromPdf(is);
                    } catch (Exception ex) {
                        log.warn("PDF metin okunamadı, sadece görsel analiz yapılacak: {}", filename);
                    }
                    String routeJson = geminiService.parseBusRoutesFromPdfMultiPass(pdfBytes, extractedText);
                    if (routeJson != null && !routeJson.isBlank() && !routeJson.equals("[]")) {
                        allRoutesLists.add(new JSONArray(routeJson));
                    }
                } else {
                    String text;
                    try (InputStream is = file.getInputStream()) {
                        if (filename.toLowerCase().endsWith(".xlsx") || filename.toLowerCase().endsWith(".xls")) {
                            text = extractTextFromExcel(is);
                        } else {
                            text = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                        }
                    }
                    if (text != null && !text.isBlank()) {
                        String routeJson = geminiService.parseBusRoutes(text);
                        if (routeJson != null && !routeJson.isBlank() && !routeJson.equals("[]")) {
                            allRoutesLists.add(new JSONArray(routeJson));
                        }
                    }
                }
            } catch (BusinessException be) {
                throw be;
            } catch (Exception e) {
                log.error("Dosya işleme hatası: " + filename, e);
                throw new BusinessException("Dosya işlenemedi: " + filename, "FILE_PROCESSING_ERROR");
            }
        }

        JSONArray jsonArray = mergeRouteLists(allRoutesLists);

        if (jsonArray.isEmpty()) {
            // Gemini API anahtarı yoksa veya parse edilemiyorsa açık hata ver
            if (isGeminiApiKeyMissing()) {
                throw new BusinessException(
                        "Yapay Zeka (Gemini) API anahtarı yapılandırılmamış. Otobüs hatları içe aktarılamıyor. Lütfen sistem yöneticinizle iletişime geçin.",
                        "AI_KEY_MISSING");
            }
            throw new BusinessException(
                    "Yüklenen dosyalardan otobüs hattı verisi çıkarılamadı. Dosyaların okunabilir otobüs tarifesi içerdiğinden emin olun.",
                    "NO_ROUTES_PARSED");
        }

        saveRoutesFromJson(municipality, jsonArray);
    }

    // ──────────────────────────────────────────────────────────────────
    // IMPORT FROM URL
    // ──────────────────────────────────────────────────────────────────

    @Transactional
    public void importRoutesFromUrl(String municipalityId, String url) {
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new BusinessException("Belediye bulunamadı", "MUNICIPALITY_NOT_FOUND"));

        if (url == null || url.isBlank()) {
            throw new BusinessException("URL boş olamaz.", "INVALID_URL");
        }

        if (isGeminiApiKeyMissing()) {
            throw new BusinessException(
                    "Yapay Zeka (Gemini) API anahtarı yapılandırılmamış. Lütfen sistem yöneticinizle iletişime geçin.",
                    "AI_KEY_MISSING");
        }

        String rawContent = fetchTextFromUrl(url);

        String routeJson = geminiService.parseBusRoutes(rawContent);
        if (routeJson == null || routeJson.isBlank() || routeJson.equals("[]")) {
            throw new BusinessException(
                    "Belirtilen URL'den otobüs hattı verisi çıkarılamadı. URL'nin geçerli otobüs tarifesi içerdiğinden emin olun.",
                    "NO_ROUTES_PARSED_FROM_URL");
        }

        JSONArray jsonArray = new JSONArray(routeJson);
        saveRoutesFromJson(municipality, jsonArray);
    }

    @Transactional(readOnly = true)
    public List<BusRouteDto> importFromUrlPreview(String municipalityId, String url) {
        municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new BusinessException("Belediye bulunamadı", "MUNICIPALITY_NOT_FOUND"));

        if (url == null || url.isBlank()) {
            throw new BusinessException("URL boş olamaz.", "INVALID_URL");
        }

        if (isGeminiApiKeyMissing()) {
            throw new BusinessException(
                    "Yapay Zeka (Gemini) API anahtarı yapılandırılmamış. Lütfen sistem yöneticinizle iletişime geçin.",
                    "AI_KEY_MISSING");
        }

        String rawContent = fetchTextFromUrl(url);
        String routeJson = geminiService.parseBusRoutes(rawContent);

        if (routeJson == null || routeJson.isBlank() || routeJson.equals("[]")) {
            throw new BusinessException(
                    "Belirtilen URL'den otobüs hattı verisi çıkarılamadı.",
                    "NO_ROUTES_PARSED_FROM_URL");
        }

        return parseJsonToPreviewDtos(new JSONArray(routeJson));
    }

    private String fetchTextFromUrl(String url) {
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(15))
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Accept", "application/json, text/plain, text/html, */*")
                    .header("User-Agent", "Kentiva-BusRouteImporter/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException(
                        "URL'ye erişilemedi. HTTP durum kodu: " + response.statusCode(),
                        "URL_FETCH_ERROR");
            }

            String body = response.body();
            if (body == null || body.isBlank()) {
                throw new BusinessException("URL yanıtı boş.", "URL_EMPTY_RESPONSE");
            }

            // Eğer JSON ise okunabilir string'e dönüştür
            if (body.trim().startsWith("{") || body.trim().startsWith("[")) {
                try {
                    Object parsed = objectMapper.readValue(body, Object.class);
                    return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(parsed);
                } catch (Exception ignored) {
                    // JSON parse başarısız, ham metin kullan
                }
            }

            return body;
        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("URL'den veri çekilirken hata: {}", url, e);
            throw new BusinessException(
                    "URL'den veri çekilemedi: " + e.getMessage(),
                    "URL_FETCH_ERROR");
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // IMPORT PREVIEW (dosyadan)
    // ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BusRouteDto> importPreview(String municipalityId, List<MultipartFile> files) {
        municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new BusinessException("Belediye bulunamadı", "MUNICIPALITY_NOT_FOUND"));

        if (files == null || files.isEmpty() || files.stream().allMatch(MultipartFile::isEmpty)) {
            return Collections.emptyList();
        }

        if (isGeminiApiKeyMissing()) {
            throw new BusinessException(
                    "Yapay Zeka (Gemini) API anahtarı yapılandırılmamış. Dosya analizi yapılamıyor. Lütfen sistem yöneticinizle iletişime geçin.",
                    "AI_KEY_MISSING");
        }

        List<JSONArray> allRoutesLists = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            String filename = file.getOriginalFilename();
            if (filename == null) continue;

            try {
                if (filename.toLowerCase().endsWith(".pdf")) {
                    byte[] pdfBytes = file.getBytes();
                    String extractedText = null;
                    try (InputStream is = file.getInputStream()) {
                        extractedText = extractTextFromPdf(is);
                    } catch (Exception ex) {
                        log.warn("PDF metin okunamadı, sadece görsel analiz yapılacak: {}", filename);
                    }
                    String routeJson = geminiService.parseBusRoutesFromPdfMultiPass(pdfBytes, extractedText);
                    if (routeJson != null && !routeJson.isBlank() && !routeJson.equals("[]")) {
                        allRoutesLists.add(new JSONArray(routeJson));
                    }
                } else {
                    String text;
                    try (InputStream is = file.getInputStream()) {
                        if (filename.toLowerCase().endsWith(".xlsx") || filename.toLowerCase().endsWith(".xls")) {
                            text = extractTextFromExcel(is);
                        } else {
                            text = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                        }
                    }
                    if (text != null && !text.isBlank()) {
                        String routeJson = geminiService.parseBusRoutes(text);
                        if (routeJson != null && !routeJson.isBlank() && !routeJson.equals("[]")) {
                            allRoutesLists.add(new JSONArray(routeJson));
                        }
                    }
                }
            } catch (BusinessException be) {
                throw be;
            } catch (Exception e) {
                log.error("Dosya işleme hatası: " + filename, e);
                throw new BusinessException("Dosya işlenemedi: " + filename, "FILE_PROCESSING_ERROR");
            }
        }

        JSONArray jsonArray = mergeRouteLists(allRoutesLists);

        if (jsonArray.isEmpty()) {
            throw new BusinessException(
                    "Yüklenen dosyalardan otobüs hattı verisi çıkarılamadı. Dosyaların okunabilir otobüs tarifesi içerdiğinden emin olun.",
                    "NO_ROUTES_PARSED");
        }

        return parseJsonToPreviewDtos(jsonArray);
    }

    // ──────────────────────────────────────────────────────────────────
    // IMPORT CONFIRM
    // ──────────────────────────────────────────────────────────────────

    @Transactional
    public void importConfirm(String municipalityId, List<BusRouteDto> routeDtos) {
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new BusinessException("Belediye bulunamadı", "MUNICIPALITY_NOT_FOUND"));

        if (routeDtos == null || routeDtos.isEmpty()) {
            throw new BusinessException("Kaydedilecek hat bulunamadı.", "NO_ROUTES_TO_CONFIRM");
        }

        List<BusRoute> existingRoutes = busRouteRepository.findAllByMunicipalityId(municipalityId);
        Map<String, BusRoute> codeToRoute = new HashMap<>();
        for (BusRoute r : existingRoutes) {
            if (r.getCode() != null) {
                codeToRoute.put(r.getCode().trim().toUpperCase(), r);
            }
        }

        Set<String> processedCodes = new HashSet<>();

        for (BusRouteDto dto : routeDtos) {
            String code = dto.code();
            if (code == null || code.trim().isEmpty()) continue;
            String codeKey = code.trim().toUpperCase();

            BusRoute route = codeToRoute.get(codeKey);
            if (route == null) {
                route = new BusRoute();
                route.setMunicipality(municipality);
                route.setCode(code);
            }

            route.setName(dto.name());
            route.setColor(dto.color());
            route.setIcon(dto.icon() != null ? dto.icon() : "bus");

            try {
                route.setStopsJson(objectMapper.writeValueAsString(dto.stops()));
                route.setScheduleJson(objectMapper.writeValueAsString(dto.schedule()));
            } catch (Exception e) {
                log.error("JSON serializing error for stops/schedule of code: " + code, e);
                throw new BusinessException("Veri formatlama hatası: " + code, "SERIALIZATION_ERROR");
            }
            route.setActive(true);

            busRouteRepository.save(route);
            processedCodes.add(codeKey);
        }

        // Yalnızca bu import'ta yer almayan eski hatları sil
        for (BusRoute r : existingRoutes) {
            if (r.getCode() != null && !processedCodes.contains(r.getCode().trim().toUpperCase())) {
                busRouteRepository.delete(r);
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // LIST ROUTES
    // ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BusRouteDto> listRoutesForMunicipality(String municipalityId, AppUser currentUser) {
        List<BusRoute> routes = busRouteRepository.findAllByMunicipalityIdAndActiveTrue(municipalityId);

        Set<String> starredRouteIds = new HashSet<>();
        if (currentUser != null) {
            starredRouteIds = starredRouteRepository.findAllByUserId(currentUser.getId()).stream()
                    .map(sr -> sr.getRoute().getId())
                    .collect(Collectors.toSet());
        }

        Set<String> finalStarredRouteIds = starredRouteIds;
        return routes.stream()
                .map(r -> mapToDto(r, finalStarredRouteIds.contains(r.getId())))
                .collect(Collectors.toList());
    }

    // ──────────────────────────────────────────────────────────────────
    // DELETE SINGLE ROUTE
    // ──────────────────────────────────────────────────────────────────

    @Transactional
    public void deleteRoute(String municipalityId, String routeId) {
        BusRoute route = busRouteRepository.findById(routeId)
                .orElseThrow(() -> new BusinessException("Hat bulunamadı.", "ROUTE_NOT_FOUND"));

        // Tenant kontrolü — sadece kendi belediyesinin hattını silebilir
        if (!route.getMunicipality().getId().equals(municipalityId)) {
            throw new BusinessException("Bu hattı silme yetkiniz yok.", "FORBIDDEN");
        }

        busRouteRepository.delete(route);
        log.info("Hat silindi: {} (Belediye: {})", routeId, municipalityId);
    }

    // ──────────────────────────────────────────────────────────────────
    // STARRED ROUTES & STOPS
    // ──────────────────────────────────────────────────────────────────

    @Transactional
    public void starRoute(AppUser user, String routeId) {
        BusRoute route = busRouteRepository.findById(routeId)
                .orElseThrow(() -> new BusinessException("Hat bulunamadı", "ROUTE_NOT_FOUND"));

        if (starredRouteRepository.existsByUserIdAndRouteId(user.getId(), routeId)) {
            return;
        }

        StarredRoute starred = StarredRoute.builder()
                .user(user)
                .route(route)
                .build();
        starredRouteRepository.save(starred);
    }

    @Transactional
    public void unstarRoute(AppUser user, String routeId) {
        starredRouteRepository.findByUserIdAndRouteId(user.getId(), routeId)
                .ifPresent(starredRouteRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<BusRouteDto> getStarredRoutes(AppUser user) {
        return starredRouteRepository.findAllByUserId(user.getId()).stream()
                .map(sr -> mapToDto(sr.getRoute(), true))
                .collect(Collectors.toList());
    }

    @Transactional
    public void starStop(AppUser user, String stopName, String municipalityId) {
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new BusinessException("Belediye bulunamadı", "MUNICIPALITY_NOT_FOUND"));

        if (starredStopRepository.existsByUserIdAndStopNameAndMunicipalityId(user.getId(), stopName, municipalityId)) {
            return;
        }

        StarredStop starred = StarredStop.builder()
                .user(user)
                .stopName(stopName)
                .municipality(municipality)
                .build();
        starredStopRepository.save(starred);
    }

    @Transactional
    public void unstarStop(AppUser user, String stopName, String municipalityId) {
        starredStopRepository.findByUserIdAndStopNameAndMunicipalityId(user.getId(), stopName, municipalityId)
                .ifPresent(starredStopRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<String> getStarredStops(AppUser user, String municipalityId) {
        return starredStopRepository.findAllByUserIdAndMunicipalityId(user.getId(), municipalityId).stream()
                .map(StarredStop::getStopName)
                .collect(Collectors.toList());
    }

    // ──────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ──────────────────────────────────────────────────────────────────

    private boolean isGeminiApiKeyMissing() {
        return geminiApiKey == null || geminiApiKey.isBlank()
                || geminiApiKey.equals("your-gemini-api-key");
    }

    private JSONArray mergeRouteLists(List<JSONArray> allRoutesLists) {
        JSONArray jsonArray = new JSONArray();
        for (JSONArray arr : allRoutesLists) {
            for (int i = 0; i < arr.length(); i++) {
                jsonArray.put(arr.getJSONObject(i));
            }
        }
        return jsonArray;
    }

    private void saveRoutesFromJson(Municipality municipality, JSONArray jsonArray) {
        try {
            List<BusRoute> existingRoutes = busRouteRepository.findAllByMunicipalityId(municipality.getId());
            Map<String, BusRoute> codeToRoute = new HashMap<>();
            for (BusRoute r : existingRoutes) {
                if (r.getCode() != null) {
                    codeToRoute.put(r.getCode().trim().toUpperCase(), r);
                }
            }

            Set<String> processedCodes = new HashSet<>();

            for (int i = 0; i < jsonArray.length(); i++) {
                JSONObject obj = jsonArray.getJSONObject(i);
                String code = obj.getString("code");
                String codeKey = code.trim().toUpperCase();

                BusRoute route = codeToRoute.get(codeKey);
                if (route == null) {
                    route = new BusRoute();
                    route.setMunicipality(municipality);
                    route.setCode(code);
                }

                route.setName(obj.getString("name"));
                route.setColor(obj.getString("color"));
                route.setIcon(obj.optString("icon", "bus"));
                route.setStopsJson(obj.getJSONArray("stops").toString());
                route.setScheduleJson(obj.getJSONObject("schedule").toString());
                route.setActive(true);

                busRouteRepository.save(route);
                processedCodes.add(codeKey);
            }

            // Yalnızca eski hatları sil
            for (BusRoute r : existingRoutes) {
                if (r.getCode() != null && !processedCodes.contains(r.getCode().trim().toUpperCase())) {
                    busRouteRepository.delete(r);
                }
            }
        } catch (Exception e) {
            log.error("Route JSON kaydedilirken hata oluştu", e);
            throw new BusinessException(
                    "Otobüs hatları kaydedilirken bir hata oluştu: " + e.getMessage(),
                    "ROUTE_SAVE_ERROR");
        }
    }

    private List<BusRouteDto> parseJsonToPreviewDtos(JSONArray jsonArray) {
        List<BusRouteDto> previewList = new ArrayList<>();
        int tempIdCounter = 0;
        for (int i = 0; i < jsonArray.length(); i++) {
            try {
                JSONObject obj = jsonArray.getJSONObject(i);
                String code = obj.optString("code", "");
                String name = obj.optString("name", "");
                String color = obj.optString("color", "#3B82F6");
                String icon = obj.optString("icon", "bus");

                List<String> stops = new ArrayList<>();
                JSONArray stopsArr = obj.optJSONArray("stops");
                if (stopsArr != null) {
                    for (int j = 0; j < stopsArr.length(); j++) {
                        stops.add(stopsArr.getString(j));
                    }
                }

                Map<String, Object> schedule = new HashMap<>();
                JSONObject schedObj = obj.optJSONObject("schedule");
                if (schedObj != null) {
                    schedule = objectMapper.readValue(schedObj.toString(), new TypeReference<Map<String, Object>>() {});
                }

                previewList.add(new BusRouteDto(
                        "temp-" + (tempIdCounter++),
                        name,
                        code,
                        stops,
                        color,
                        icon,
                        schedule,
                        false
                ));
            } catch (Exception e) {
                log.error("Preview mapping hatası: ", e);
            }
        }
        return previewList;
    }

    private BusRouteDto mapToDto(BusRoute route, boolean isStarred) {
        List<String> stops = new ArrayList<>();
        Map<String, Object> schedule = new HashMap<>();

        try {
            stops = objectMapper.readValue(route.getStopsJson(), new TypeReference<List<String>>() {});
            schedule = objectMapper.readValue(route.getScheduleJson(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("JSON parse hatası: stops veya schedule (routeId={})", route.getId(), e);
        }

        return new BusRouteDto(
                route.getId(),
                route.getName(),
                route.getCode(),
                stops,
                route.getColor(),
                route.getIcon(),
                schedule,
                isStarred
        );
    }

    private String extractTextFromPdf(InputStream is) {
        try {
            byte[] bytes = is.readAllBytes();
            try (org.apache.pdfbox.pdmodel.PDDocument document = org.apache.pdfbox.Loader.loadPDF(bytes)) {
                org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper();
                return stripper.getText(document);
            }
        } catch (Exception e) {
            log.error("PDF metin çıkarma hatası: ", e);
            return "";
        }
    }

    private String extractTextFromExcel(InputStream is) {
        StringBuilder sb = new StringBuilder();
        try (Workbook workbook = WorkbookFactory.create(is)) {
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                sb.append("Sheet: ").append(sheet.getSheetName()).append("\n");
                for (Row row : sheet) {
                    for (Cell cell : row) {
                        switch (cell.getCellType()) {
                            case STRING -> sb.append(cell.getStringCellValue()).append("\t");
                            case NUMERIC -> sb.append(cell.getNumericCellValue()).append("\t");
                            case BOOLEAN -> sb.append(cell.getBooleanCellValue()).append("\t");
                            case FORMULA -> sb.append(cell.getCellFormula()).append("\t");
                            default -> sb.append(" ").append("\t");
                        }
                    }
                    sb.append("\n");
                }
            }
        } catch (Exception e) {
            log.error("Excel metin çıkarma hatası: ", e);
        }
        return sb.toString();
    }
}
