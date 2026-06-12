package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.response.report.BulkReportOperationResult;
import com.burak.belediyeapp.dto.response.report.BulkReportOperationResult.BulkReportFailure;
import com.burak.belediyeapp.entity.*;
import com.burak.belediyeapp.repository.*;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportImportService {

    private final IReportRepository reportRepository;
    private final IReportCategoryRepository categoryRepository;
    private final IAppUserRepository userRepository;
    private final IRoleRepository roleRepository;
    private final IReportHistoryRepository historyRepository;
    private final IMunicipalityRepository municipalityRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantAccessService tenantAccess;

    @Transactional
    public BulkReportOperationResult importReports(MultipartFile file, AppUser currentUser) {
        String municipalityId = tenantAccess.requireStaffMunicipalityId(currentUser);
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new IllegalArgumentException("Belediye bulunamadı."));

        List<BulkReportFailure> failures = new ArrayList<>();
        int successCount = 0;

        String contentType = file.getContentType();
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        try (InputStream is = file.getInputStream()) {
            if (filename.endsWith(".xlsx") || filename.endsWith(".xls") || (contentType != null && (contentType.contains("excel") || contentType.contains("spreadsheetml")))) {
                Workbook workbook = new XSSFWorkbook(is);
                Sheet sheet = workbook.getSheetAt(0);
                int rowCount = sheet.getLastRowNum();
                for (int i = 1; i <= rowCount; i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) continue;
                    try {
                        importRow(row, municipality, i + 1);
                        successCount++;
                    } catch (Exception e) {
                        failures.add(new BulkReportFailure("Satır " + (i + 1), e.getMessage()));
                    }
                }
                workbook.close();
            } else {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                    br.readLine(); // header
                    String line;
                    int lineNum = 1;
                    while ((line = br.readLine()) != null) {
                        lineNum++;
                        if (line.trim().isEmpty()) continue;
                        try {
                            importCsvLine(line, municipality, lineNum);
                            successCount++;
                        } catch (Exception e) {
                            failures.add(new BulkReportFailure("Satır " + lineNum, e.getMessage()));
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse import file", e);
            failures.add(new BulkReportFailure("Dosya", "Dosya okunurken hata oluştu: " + e.getMessage()));
        }

        return new BulkReportOperationResult(successCount, failures.size(), failures);
    }

    private void importRow(Row row, Municipality municipality, int rowNum) {
        String title = getCellStringValue(row.getCell(0));
        String description = getCellStringValue(row.getCell(1));
        String categoryName = getCellStringValue(row.getCell(2));
        Double latitude = getCellNumericValue(row.getCell(3));
        Double longitude = getCellNumericValue(row.getCell(4));
        String reporterEmail = getCellStringValue(row.getCell(5));
        String reporterPhone = getCellStringValue(row.getCell(6));
        String reporterName = getCellStringValue(row.getCell(7));

        processAndSaveImportedReport(title, description, categoryName, latitude, longitude, reporterEmail, reporterPhone, reporterName, municipality, rowNum);
    }

    private void importCsvLine(String line, Municipality municipality, int lineNum) {
        String[] tokens = line.split("[,;]");
        if (tokens.length < 5) {
            throw new IllegalArgumentException("Eksik sütun bilgisi. En az Title, Description, CategoryName, Latitude, Longitude bulunmalıdır.");
        }

        String title = tokenOrNull(tokens, 0);
        String description = tokenOrNull(tokens, 1);
        String categoryName = tokenOrNull(tokens, 2);
        Double latitude = parseDoubleOrNull(tokenOrNull(tokens, 3));
        Double longitude = parseDoubleOrNull(tokenOrNull(tokens, 4));
        String reporterEmail = tokenOrNull(tokens, 5);
        String reporterPhone = tokenOrNull(tokens, 6);
        String reporterName = tokenOrNull(tokens, 7);

        processAndSaveImportedReport(title, description, categoryName, latitude, longitude, reporterEmail, reporterPhone, reporterName, municipality, lineNum);
    }

    private void processAndSaveImportedReport(String title, String description, String categoryName,
                                             Double latitude, Double longitude, String reporterEmail,
                                             String reporterPhone, String reporterName, Municipality municipality, int refNum) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Başlık alanı boş olamaz.");
        }
        if (categoryName == null || categoryName.isBlank()) {
            throw new IllegalArgumentException("Kategori alanı boş olamaz.");
        }
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("Koordinat alanları (Latitude, Longitude) boş olamaz.");
        }

        boolean inside = municipalityRepository.isWithinBoundaries(municipality.getId(), latitude, longitude);
        if (!inside) {
            throw new IllegalArgumentException("Koordinatlar belediye sınırları dışındadır.");
        }

        List<ReportCategory> cats = categoryRepository.findVisibleToMunicipalityByName(categoryName, municipality.getId());
        if (cats.isEmpty()) {
            throw new IllegalArgumentException("Belirtilen isimde aktif kategori bulunamadı: " + categoryName);
        }
        ReportCategory category = cats.get(0);

        AppUser reporter = resolveOrCreateReporter(reporterEmail, reporterPhone, reporterName, municipality);

        GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        org.locationtech.jts.geom.Point location = geometryFactory.createPoint(new Coordinate(longitude, latitude));

        String trackingNumber = generateUniqueTrackingNumber();

        Report report = Report.builder()
                .title(title)
                .description(description != null ? description : "")
                .category(category)
                .reporter(reporter)
                .location(location)
                .municipality(municipality)
                .district(municipality.getName())
                .reportStatus(ReportStatus.PENDING)
                .trackingNumber(trackingNumber)
                .contentLanguage("tr")
                .build();

        Report saved = reportRepository.save(report);

        historyRepository.save(ReportHistory.builder()
                .report(saved)
                .oldStatus(null)
                .newStatus(ReportStatus.PENDING)
                .changedBy(null)
                .note("Toplu içe aktarma ile oluşturuldu.")
                .build());
    }

    private AppUser resolveOrCreateReporter(String email, String phone, String fullName, Municipality municipality) {
        if (email != null && !email.isBlank()) {
            Optional<AppUser> user = userRepository.findByEmail(email.trim());
            if (user.isPresent()) return user.get();
        }
        if (phone != null && !phone.isBlank()) {
            Optional<AppUser> user = userRepository.findByPhoneNumber(phone.trim());
            if (user.isPresent()) return user.get();
        }

        Role citizenRole = roleRepository.findByName("ROLE_CITIZEN")
                .orElseThrow(() -> new IllegalStateException("ROLE_CITIZEN rolü bulunamadı."));

        if ((email == null || email.isBlank()) && (phone == null || phone.isBlank())) {
            String defaultEmail = "callcenter-" + municipality.getSlug() + "@kentiva.app";
            return userRepository.findByEmail(defaultEmail).orElseGet(() -> {
                AppUser c = new AppUser();
                c.setEmail(defaultEmail);
                c.setFirstName("Telefon");
                c.setLastName("Merkezi");
                c.setRoles(Collections.singleton(citizenRole));
                c.setMunicipality(municipality);
                c.setReputationScore(100);
                c.setEnabled(true);
                c.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                return userRepository.save(c);
            });
        }

        String finalEmail = (email != null && !email.isBlank()) ? email.trim() : "citizen-" + UUID.randomUUID().toString().substring(0, 8) + "@kentiva.app";
        String first = "İsimsiz";
        String last = "Vatandaş";
        if (fullName != null && !fullName.isBlank()) {
            String[] parts = fullName.trim().split("\\s+");
            if (parts.length > 0) first = parts[0];
            if (parts.length > 1) {
                StringBuilder sb = new StringBuilder();
                for (int idx = 1; idx < parts.length; idx++) {
                    sb.append(parts[idx]).append(" ");
                }
                last = sb.toString().trim();
            }
        }

        AppUser citizen = new AppUser();
        citizen.setEmail(finalEmail);
        citizen.setPhoneNumber(phone != null && !phone.isBlank() ? phone.trim() : null);
        citizen.setFirstName(first);
        citizen.setLastName(last);
        citizen.setRoles(Collections.singleton(citizenRole));
        citizen.setMunicipality(municipality);
        citizen.setReputationScore(100);
        citizen.setEnabled(true);
        citizen.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));

        return userRepository.save(citizen);
    }

    private String generateUniqueTrackingNumber() {
        LocalDate now = LocalDate.now();
        String dateStr = now.format(DateTimeFormatter.ofPattern("yyMMdd"));
        String alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        SecureRandom rng = new SecureRandom();
        while (true) {
            StringBuilder sb = new StringBuilder(4);
            for (int i = 0; i < 4; i++) {
                sb.append(alpha.charAt(rng.nextInt(alpha.length())));
            }
            String trackingNum = "KNT-" + dateStr + "-" + sb.toString();
            if (!reportRepository.existsByTrackingNumber(trackingNum)) {
                return trackingNum;
            }
        }
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue().trim();
        if (cell.getCellType() == CellType.NUMERIC) {
            return String.valueOf((long) cell.getNumericCellValue());
        }
        return null;
    }

    private Double getCellNumericValue(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC) return cell.getNumericCellValue();
        if (cell.getCellType() == CellType.STRING) {
            try {
                return Double.parseDouble(cell.getStringCellValue().trim());
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    private String tokenOrNull(String[] tokens, int idx) {
        if (idx < tokens.length) {
            String val = tokens[idx].trim();
            return val.isEmpty() ? null : val;
        }
        return null;
    }

    private Double parseDoubleOrNull(String val) {
        if (val == null) return null;
        try {
            return Double.parseDouble(val);
        } catch (Exception e) {
            return null;
        }
    }
}
