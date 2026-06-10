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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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

    @Transactional
    public void importRoutes(String municipalityId, List<MultipartFile> files) {
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new BusinessException("Belediye bulunamadı", "MUNICIPALITY_NOT_FOUND"));

        if (files == null || files.isEmpty() || files.stream().allMatch(MultipartFile::isEmpty)) {
            // Hiç dosya verilmediyse fallback tohumlaması yapalım
            busRouteRepository.deleteAllByMunicipalityId(municipalityId);
            saveFallbackSeedData(municipality);
            return;
        }

        List<JSONArray> allRoutesLists = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            String filename = file.getOriginalFilename();
            if (filename == null) continue;

            try {
                if (filename.toLowerCase().endsWith(".pdf")) {
                    byte[] pdfBytes = file.getBytes();
                    String routeJson = geminiService.parseBusRoutesFromPdf(pdfBytes);
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
            } catch (Exception e) {
                log.error("Dosya işleme hatası: " + filename, e);
                throw new BusinessException("Dosya işlenemedi: " + filename, "FILE_PROCESSING_ERROR");
            }
        }

        JSONArray jsonArray = new JSONArray();
        for (JSONArray arr : allRoutesLists) {
            for (int i = 0; i < arr.length(); i++) {
                jsonArray.put(arr.getJSONObject(i));
            }
        }

        if (jsonArray.isEmpty()) {
            log.warn("AI hatları çözümleyemedi veya API anahtarı eksik. Varsayılan hatlar yükleniyor.");
            busRouteRepository.deleteAllByMunicipalityId(municipalityId);
            saveFallbackSeedData(municipality);
            return;
        }

        try {
            List<BusRoute> existingRoutes = busRouteRepository.findAllByMunicipalityId(municipalityId);
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

            // Delete only obsolete routes
            for (BusRoute r : existingRoutes) {
                if (r.getCode() != null && !processedCodes.contains(r.getCode().trim().toUpperCase())) {
                    busRouteRepository.delete(r);
                }
            }
        } catch (Exception e) {
            log.error("AI yanıtını ayrıştırma hatası, fallback yükleniyor", e);
            busRouteRepository.deleteAllByMunicipalityId(municipalityId);
            saveFallbackSeedData(municipality);
        }
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

    private void saveFallbackSeedData(Municipality municipality) {
        BusRoute route1 = BusRoute.builder()
                .name("Şehir İçi Hattı")
                .code("Şİ")
                .color("#10B981")
                .icon("bus")
                .stopsJson("[\"Kıranköy\", \"Sadri Artunç Caddesi\", \"Eski Çarşı\"]")
                .scheduleJson("{\"weekday\": {\"departuresFromStart\": [\"07:00\", \"08:00\", \"09:00\"], \"departuresFromEnd\": [\"07:30\", \"08:30\", \"09:30\"]}}")
                .active(true)
                .municipality(municipality)
                .build();
        busRouteRepository.save(route1);

        BusRoute route2 = BusRoute.builder()
                .name("Safranbolu - Karabük")
                .code("SK")
                .color("#3B82F6")
                .icon("bus")
                .stopsJson("[\"Safranbolu Otogar\", \"Kıranköy\", \"Karabük Merkez\"]")
                .scheduleJson("{\"weekday\": {\"departuresFromStart\": [\"07:15\", \"08:15\"], \"departuresFromEnd\": [\"07:45\", \"08:45\"]}}")
                .active(true)
                .municipality(municipality)
                .build();
        busRouteRepository.save(route2);
    }

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

    private BusRouteDto mapToDto(BusRoute route, boolean isStarred) {
        List<String> stops = new ArrayList<>();
        Map<String, Object> schedule = new HashMap<>();

        try {
            stops = objectMapper.readValue(route.getStopsJson(), new TypeReference<List<String>>() {});
            schedule = objectMapper.readValue(route.getScheduleJson(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("JSON parse hatası: stops veya schedule", e);
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
}
