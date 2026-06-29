package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.response.report.BulkReportOperationResult;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportCategory;
import com.burak.belediyeapp.entity.ReportHistory;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IReportHistoryRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.repository.IRoleRepository;
import com.burak.belediyeapp.tenant.TenantAccessService;
import com.burak.belediyeapp.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportImportService {

    private static final GeometryFactory GEOMETRY_FACTORY =
            new GeometryFactory(new PrecisionModel(), 4326);
    private static final DateTimeFormatter TRACKING_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyMMdd");
    private static final String TRACKING_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private final IReportRepository reportRepository;
    private final IReportCategoryRepository categoryRepository;
    private final IAppUserRepository userRepository;
    private final IRoleRepository roleRepository;
    private final IReportHistoryRepository historyRepository;
    private final IMunicipalityRepository municipalityRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantAccessService tenantAccess;
    private final com.burak.belediyeapp.service.security.PasswordPolicyService passwordPolicyService;

    private final SecureRandom secureRandom = new SecureRandom();
    private final DataFormatter dataFormatter = new DataFormatter(Locale.forLanguageTag("tr-TR"));

    @Autowired
    @Lazy
    private ReportImportService self;

    @Value("${app.report-import.max-rows:5000}")
    private int maxRows;

    @Value("${app.report-import.batch-size:100}")
    private int batchSize;

    public BulkReportOperationResult importReports(MultipartFile file, AppUser currentUser) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Ithal edilecek dosya bos olamaz.", "IMPORT_FILE_REQUIRED");
        }

        String municipalityId = tenantAccess.requireStaffMunicipalityId(currentUser);
        String actorId = currentUser != null ? currentUser.getId() : null;
        List<BulkReportOperationResult.BulkReportFailure> failures = new ArrayList<>();

        String originalFilename = Optional.ofNullable(file.getOriginalFilename())
                .orElse("")
                .trim()
                .toLowerCase(Locale.ROOT);

        int successCount;
        if (originalFilename.endsWith(".csv")) {
            successCount = importCsv(file, municipalityId, actorId, failures);
        } else if (originalFilename.endsWith(".xlsx") || originalFilename.endsWith(".xls")) {
            successCount = importWorkbook(file, municipalityId, actorId, failures);
        } else {
            throw new BusinessException(
                    "Desteklenmeyen dosya formati. Lutfen CSV veya Excel dosyasi yukleyin.",
                    "IMPORT_FILE_TYPE_UNSUPPORTED");
        }

        return new BulkReportOperationResult(successCount, failures.size(), failures);
    }

    private int importWorkbook(
            MultipartFile file,
            String municipalityId,
            String actorId,
            List<BulkReportOperationResult.BulkReportFailure> failures
    ) {
        int importedRowCount = 0;
        int successCount = 0;
        List<ImportedRow> batch = new ArrayList<>(effectiveBatchSize());

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) {
                throw new BusinessException("Excel dosyasinda okunacak bir sayfa bulunamadi.", "IMPORT_SHEET_MISSING");
            }

            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (isRowEmpty(row)) {
                    continue;
                }
                importedRowCount = incrementRowCount(importedRowCount);
                try {
                    batch.add(parseExcelRow(row, rowIndex + 1));
                    if (batch.size() >= effectiveBatchSize()) {
                        successCount += importBatch(batch, municipalityId, actorId, failures);
                        batch.clear();
                    }
                } catch (Exception e) {
                    failures.add(new BulkReportOperationResult.BulkReportFailure(
                            sourceLabel(rowIndex + 1),
                            safeFailureMessage(e)));
                }
            }

            if (!batch.isEmpty()) {
                successCount += importBatch(batch, municipalityId, actorId, failures);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Excel import could not be processed: {}", e.getMessage());
            throw new BusinessException("Excel dosyasi okunamadi veya bozuk.", "IMPORT_FILE_INVALID");
        }

        return successCount;
    }

    private int importCsv(
            MultipartFile file,
            String municipalityId,
            String actorId,
            List<BulkReportOperationResult.BulkReportFailure> failures
    ) {
        int importedRowCount = 0;
        int successCount = 0;
        List<ImportedRow> batch = new ArrayList<>(effectiveBatchSize());

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw new BusinessException("CSV dosyasi bos olamaz.", "IMPORT_FILE_EMPTY");
            }
            char delimiter = detectDelimiter(headerLine);

            String line;
            int lineNumber = 1;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (line.isBlank()) {
                    continue;
                }

                List<String> columns = splitCsvLine(line, delimiter);
                if (columns.stream().allMatch(value -> value == null || value.isBlank())) {
                    continue;
                }

                importedRowCount = incrementRowCount(importedRowCount);
                try {
                    batch.add(parseCsvRow(columns, lineNumber));
                    if (batch.size() >= effectiveBatchSize()) {
                        successCount += importBatch(batch, municipalityId, actorId, failures);
                        batch.clear();
                    }
                } catch (Exception e) {
                    failures.add(new BulkReportOperationResult.BulkReportFailure(
                            sourceLabel(lineNumber),
                            safeFailureMessage(e)));
                }
            }

            if (!batch.isEmpty()) {
                successCount += importBatch(batch, municipalityId, actorId, failures);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (IOException e) {
            log.warn("CSV import could not be read: {}", e.getMessage());
            throw new BusinessException("CSV dosyasi okunamadi.", "IMPORT_FILE_INVALID");
        }

        return successCount;
    }

    private int importBatch(
            List<ImportedRow> batch,
            String municipalityId,
            String actorId,
            List<BulkReportOperationResult.BulkReportFailure> failures
    ) {
        ChunkImportResult result = self.importChunk(List.copyOf(batch), municipalityId, actorId);
        failures.addAll(result.failures());
        return result.successCount();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ChunkImportResult importChunk(List<ImportedRow> rows, String municipalityId, String actorId) {
        Municipality municipality = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        Role citizenRole = roleRepository.findByName("ROLE_CITIZEN")
                .orElseThrow(() -> new ResourceNotFoundException("Rol", "name", "ROLE_CITIZEN"));
        AppUser importedBy = actorId == null ? null : userRepository.findById(actorId).orElse(null);

        int successCount = 0;
        List<BulkReportOperationResult.BulkReportFailure> failures = new ArrayList<>();

        for (ImportedRow row : rows) {
            try {
                processImportedRow(row, municipality, citizenRole, importedBy);
                successCount++;
            } catch (Exception e) {
                failures.add(new BulkReportOperationResult.BulkReportFailure(
                        row.sourceLabel(),
                        safeFailureMessage(e)));
                log.debug("Imported row failed: {} - {}", row.sourceLabel(), e.getMessage(), e);
            }
        }

        return new ChunkImportResult(successCount, failures);
    }

    private void processImportedRow(ImportedRow row, Municipality municipality, Role citizenRole, AppUser importedBy) {
        String title = required(row.title(), "Baslik zorunludur.");
        String description = required(row.description(), "Aciklama zorunludur.");
        String categoryName = required(row.categoryName(), "Kategori zorunludur.");
        double latitude = requireCoordinate(row.latitude(), "Gecerli bir enlem zorunludur.");
        double longitude = requireCoordinate(row.longitude(), "Gecerli bir boylam zorunludur.");

        if (!isLatitudeWithinBounds(latitude) || !isLongitudeWithinBounds(longitude)) {
            throw new BusinessException("Koordinatlar gecerli aralikta degil.", "IMPORT_INVALID_COORDINATES");
        }
        if (!municipalityRepository.isWithinBoundaries(municipality.getId(), latitude, longitude)) {
            throw new BusinessException(
                    "Konum secili belediyenin sinirlari icinde degil.",
                    "IMPORT_LOCATION_OUTSIDE_SCOPE");
        }

        ReportCategory category = resolveCategory(categoryName, municipality.getId());
        AppUser reporter = resolveOrCreateReporter(row, municipality, citizenRole);

        Point location = GEOMETRY_FACTORY.createPoint(new Coordinate(longitude, latitude));
        location.setSRID(4326);

        Report report = Report.builder()
                .title(title)
                .description(description)
                .location(location)
                .reportStatus(ReportStatus.PENDING)
                .category(category)
                .reporter(reporter)
                .district(ReportSupport.municipalityDisplayLabel(municipality))
                .municipality(municipality)
                .contentLanguage("tr")
                .trackingNumber(generateUniqueTrackingNumber())
                .build();

        Report saved = reportRepository.save(report);
        historyRepository.save(ReportHistory.builder()
                .report(saved)
                .oldStatus(null)
                .newStatus(ReportStatus.PENDING)
                .changedBy(importedBy)
                .note("Toplu ice aktarma ile olusturuldu.")
                .build());
    }

    private ReportCategory resolveCategory(String categoryName, String municipalityId) {
        return categoryRepository.findVisibleToMunicipalityByName(categoryName, municipalityId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        "Kategori bu belediye icin bulunamadi: " + categoryName,
                        "IMPORT_CATEGORY_NOT_FOUND"));
    }

    private AppUser resolveOrCreateReporter(ImportedRow row, Municipality municipality, Role citizenRole) {
        String email = normalizeEmail(row.reporterEmail());
        String phone = tokenOrNull(row.reporterPhone());

        Optional<AppUser> userByEmail = email == null ? Optional.empty() : userRepository.findByEmail(email);
        Optional<AppUser> userByPhone = phone == null ? Optional.empty() : userRepository.findByPhoneNumber(phone);

        if (userByEmail.isPresent() && userByPhone.isPresent()
                && !userByEmail.get().getId().equals(userByPhone.get().getId())) {
            throw new BusinessException(
                    "E-posta ve telefon farkli kullanicilara ait gorunuyor.",
                    "IMPORT_REPORTER_CONFLICT");
        }

        if (userByEmail.isPresent()) {
            return userByEmail.get();
        }
        if (userByPhone.isPresent()) {
            return userByPhone.get();
        }

        AppUser newReporter = new AppUser();
        newReporter.setEmail(email != null ? email : generateFallbackEmail(municipality));
        newReporter.setPassword(passwordEncoder.encode(passwordPolicyService.generateStrongPassword(16, false)));
        newReporter.setFirstName(defaultValue(row.reporterFirstName(), "Vatandas"));
        newReporter.setLastName(defaultValue(row.reporterLastName(), "Basvurusu"));
        newReporter.setPhoneNumber(phone);
        newReporter.setEnabled(true);
        newReporter.setPreferredMunicipality(municipality);
        newReporter.setReputationScore(100);
        newReporter.setLoyaltyPoints(100);

        Set<Role> roles = new HashSet<>(Collections.singleton(citizenRole));
        newReporter.setRoles(roles);
        return userRepository.save(newReporter);
    }

    private ImportedRow parseExcelRow(Row row, int sourceLineNumber) {
        return new ImportedRow(
                sourceLabel(sourceLineNumber),
                getCellStringValue(row.getCell(0)),
                getCellStringValue(row.getCell(1)),
                getCellStringValue(row.getCell(2)),
                getCellNumericValue(row.getCell(3), "Enlem degeri gecersiz."),
                getCellNumericValue(row.getCell(4), "Boylam degeri gecersiz."),
                tokenOrNull(getCellStringValue(row.getCell(5))),
                tokenOrNull(getCellStringValue(row.getCell(6))),
                tokenOrNull(getCellStringValue(row.getCell(7))),
                tokenOrNull(getCellStringValue(row.getCell(8)))
        );
    }

    private ImportedRow parseCsvRow(List<String> columns, int sourceLineNumber) {
        return new ImportedRow(
                sourceLabel(sourceLineNumber),
                tokenOrNull(column(columns, 0)),
                tokenOrNull(column(columns, 1)),
                tokenOrNull(column(columns, 2)),
                parseDoubleOrNull(column(columns, 3), "Enlem degeri gecersiz."),
                parseDoubleOrNull(column(columns, 4), "Boylam degeri gecersiz."),
                tokenOrNull(column(columns, 5)),
                tokenOrNull(column(columns, 6)),
                tokenOrNull(column(columns, 7)),
                tokenOrNull(column(columns, 8))
        );
    }

    private String column(List<String> values, int index) {
        return index < values.size() ? values.get(index) : null;
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) {
            return null;
        }
        String formatted = dataFormatter.formatCellValue(cell);
        return tokenOrNull(formatted);
    }

    private Double getCellNumericValue(Cell cell, String invalidMessage) {
        if (cell == null) {
            return null;
        }

        CellType cellType = cell.getCellType();
        if (cellType == CellType.NUMERIC) {
            return cell.getNumericCellValue();
        }
        if (cellType == CellType.FORMULA && cell.getCachedFormulaResultType() == CellType.NUMERIC) {
            return cell.getNumericCellValue();
        }
        return parseDoubleOrNull(getCellStringValue(cell), invalidMessage);
    }

    private Double parseDoubleOrNull(String value, String invalidMessage) {
        String normalized = tokenOrNull(value);
        if (normalized == null) {
            return null;
        }

        String candidate = normalized.replace(" ", "").replace(',', '.');
        try {
            return Double.parseDouble(candidate);
        } catch (NumberFormatException e) {
            throw new BusinessException(invalidMessage, "IMPORT_INVALID_NUMBER");
        }
    }

    private List<String> splitCsvLine(String line, char delimiter) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (ch == delimiter && !inQuotes) {
                values.add(tokenOrNull(current.toString()));
                current.setLength(0);
                continue;
            }

            current.append(ch);
        }

        values.add(tokenOrNull(current.toString()));
        return values;
    }

    private char detectDelimiter(String headerLine) {
        int semicolonCount = 0;
        int commaCount = 0;
        boolean inQuotes = false;

        for (int i = 0; i < headerLine.length(); i++) {
            char ch = headerLine.charAt(i);
            if (ch == '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if (inQuotes) {
                continue;
            }
            if (ch == ';') {
                semicolonCount++;
            } else if (ch == ',') {
                commaCount++;
            }
        }

        return semicolonCount > commaCount ? ';' : ',';
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }
        for (int i = 0; i < 9; i++) {
            if (tokenOrNull(getCellStringValue(row.getCell(i))) != null) {
                return false;
            }
        }
        return true;
    }

    private int incrementRowCount(int currentCount) {
        int nextCount = currentCount + 1;
        if (nextCount > effectiveMaxRows()) {
            throw new BusinessException(
                    "Tek seferde en fazla " + effectiveMaxRows() + " satir ice aktarilabilir.",
                    "IMPORT_ROW_LIMIT_EXCEEDED");
        }
        return nextCount;
    }

    private int effectiveBatchSize() {
        return Math.max(1, batchSize);
    }

    private int effectiveMaxRows() {
        return Math.max(1, maxRows);
    }

    private String required(String value, String message) {
        String normalized = tokenOrNull(value);
        if (normalized == null) {
            throw new BusinessException(message, "IMPORT_REQUIRED_FIELD");
        }
        return normalized;
    }

    private double requireCoordinate(Double value, String message) {
        if (value == null || !Double.isFinite(value)) {
            throw new BusinessException(message, "IMPORT_INVALID_COORDINATES");
        }
        return value;
    }

    private boolean isLatitudeWithinBounds(double latitude) {
        return latitude >= -90 && latitude <= 90;
    }

    private boolean isLongitudeWithinBounds(double longitude) {
        return longitude >= -180 && longitude <= 180;
    }

    private String normalizeEmail(String email) {
        String normalized = tokenOrNull(email);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }

    private String tokenOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String defaultValue(String value, String fallback) {
        String normalized = tokenOrNull(value);
        return normalized != null ? normalized : fallback;
    }

    private String generateFallbackEmail(Municipality municipality) {
        String slug = tokenOrNull(municipality.getSlug());
        if (slug == null) {
            slug = SlugUtils.slugify(ReportSupport.municipalityDisplayLabel(municipality));
        }
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return "callcenter-" + slug + "-" + suffix + "@kentiva.app";
    }

    private String generateUniqueTrackingNumber() {
        String datePart = LocalDate.now().format(TRACKING_DATE_FORMAT);
        while (true) {
            StringBuilder builder = new StringBuilder(4);
            for (int i = 0; i < 4; i++) {
                builder.append(TRACKING_ALPHABET.charAt(secureRandom.nextInt(TRACKING_ALPHABET.length())));
            }
            String trackingNumber = "KNT-" + datePart + "-" + builder;
            if (!reportRepository.existsByTrackingNumber(trackingNumber)) {
                return trackingNumber;
            }
        }
    }

    private String safeFailureMessage(Exception exception) {
        String message = tokenOrNull(exception.getMessage());
        if (message == null) {
            return "Satir islenirken beklenmeyen bir hata olustu.";
        }
        return message.length() <= 220 ? message : message.substring(0, 220) + "...";
    }

    private String sourceLabel(int lineNumber) {
        return "Satir " + lineNumber;
    }

    private record ImportedRow(
            String sourceLabel,
            String title,
            String description,
            String categoryName,
            Double latitude,
            Double longitude,
            String reporterEmail,
            String reporterPhone,
            String reporterFirstName,
            String reporterLastName
    ) {
    }

    public record ChunkImportResult(
            int successCount,
            List<BulkReportOperationResult.BulkReportFailure> failures
    ) {
    }
}
