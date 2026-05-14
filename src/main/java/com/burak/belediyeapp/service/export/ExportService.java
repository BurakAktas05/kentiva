package com.burak.belediyeapp.service.export;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IReportRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * Rapor verilerini Excel formatında dışa aktarma servisi.
 * Multi-tenant: municipalityId ile filtreleme zorunludur (SUPER_ADMIN hariç).
 */
@Service
@RequiredArgsConstructor
public class ExportService {

    private final IReportRepository reportRepository;

    public byte[] exportReportsToExcel(String municipalityId) throws IOException {
        List<Report> reports;
        if (municipalityId != null) {
            reports = reportRepository.findByMunicipalityId(municipalityId, org.springframework.data.domain.Pageable.unpaged()).getContent();
        } else {
            reports = reportRepository.findAll();
        }

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Raporlar");

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            // Date style
            CellStyle dateStyle = workbook.createCellStyle();
            CreationHelper createHelper = workbook.getCreationHelper();
            dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("dd.MM.yyyy HH:mm"));

            // Header row
            Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "ID", "Başlık", "Açıklama", "Kategori", "İlçe/Belediye",
                    "Durum", "AI Öncelik", "AI Özet", "Raporlayan",
                    "Atanan Görevli", "Oluşturulma Tarihi", "Güncellenme Tarihi"
            };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowIdx = 1;
            for (Report report : reports) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(report.getId());
                row.createCell(1).setCellValue(report.getTitle());
                row.createCell(2).setCellValue(truncate(report.getDescription(), 500));
                row.createCell(3).setCellValue(report.getCategory() != null ? report.getCategory().getName() : "");
                row.createCell(4).setCellValue(report.getDistrict() != null ? report.getDistrict() : "");
                row.createCell(5).setCellValue(report.getReportStatus() != null ? statusTurkish(report.getReportStatus().toString()) : "");
                row.createCell(6).setCellValue(report.getAiPriority() != null ? report.getAiPriority() : "");
                row.createCell(7).setCellValue(report.getAiSummary() != null ? report.getAiSummary() : "");
                row.createCell(8).setCellValue(report.getReporter() != null ? report.getReporter().getFullName() : "");
                row.createCell(9).setCellValue(report.getAssignee() != null ? report.getAssignee().getFullName() : "");
                row.createCell(10).setCellValue(report.getCreatedAt() != null ? report.getCreatedAt().toString() : "");
                row.createCell(11).setCellValue(report.getUpdatedAt() != null ? report.getUpdatedAt().toString() : "");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                // Max column width limit
                if (sheet.getColumnWidth(i) > 15000) {
                    sheet.setColumnWidth(i, 15000);
                }
            }

            // Freeze header row
            sheet.createFreezePane(0, 1);

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private static String statusTurkish(String status) {
        return switch (status) {
            case "PENDING" -> "Bekliyor";
            case "PROCESSING" -> "İşleniyor";
            case "RESOLVED" -> "Çözüldü";
            case "REJECTED" -> "Reddedildi";
            default -> status;
        };
    }

    private static String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "…";
    }
}
