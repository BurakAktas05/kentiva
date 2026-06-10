package com.burak.belediyeapp.service.export;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IReportRepository;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.FontFactory;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExportService {

    private final IReportRepository reportRepository;

    @Value("${app.export.max-rows:10000}")
    private int exportMaxRows;

    public List<Report> loadReports(ExportFilter filter) {
        if (filter.reportIds() != null && !filter.reportIds().isEmpty()) {
            List<String> ids = filter.reportIds().size() > exportMaxRows
                    ? filter.reportIds().subList(0, exportMaxRows)
                    : filter.reportIds();
            return reportRepository.findForExportByIds(ids, filter.municipalityId());
        }
        return reportRepository.findForExport(
                filter.municipalityId(),
                filter.status(),
                filter.from(),
                filter.to(),
                PageRequest.of(0, exportMaxRows));
    }

    public byte[] exportReportsToExcel(ExportFilter filter) throws IOException {
        return buildExcel(loadReports(filter));
    }

    public byte[] exportReportsToPdf(ExportFilter filter) throws IOException {
        return buildPdf(loadReports(filter));
    }

    public Path writeExportFile(ExportFilter filter, ExportScheduleFormat format, Path targetDir) throws IOException {
        Files.createDirectories(targetDir);
        String date = java.time.LocalDate.now().toString();
        String ext = format == ExportScheduleFormat.PDF ? "pdf" : "xlsx";
        String fileName = "kentiva-raporlar-" + date + "." + ext;
        Path path = targetDir.resolve(fileName);
        byte[] data = format == ExportScheduleFormat.PDF
                ? exportReportsToPdf(filter)
                : exportReportsToExcel(filter);
        Files.write(path, data);
        return path;
    }

    public enum ExportScheduleFormat {
        EXCEL, PDF
    }

    private byte[] buildExcel(List<Report> reports) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Raporlar");

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {
                    "ID", "Başlık", "Açıklama", "Kategori", "İlçe",
                    "Durum", "AI Öncelik", "AI Özet", "Raporlayan",
                    "Atanan", "Oluşturulma", "Güncellenme"
            };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Report report : reports) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(report.getId());
                row.createCell(1).setCellValue(report.getTitle());
                row.createCell(2).setCellValue(truncate(report.getDescription(), 500));
                row.createCell(3).setCellValue(report.getCategory() != null ? report.getCategory().getName() : "");
                row.createCell(4).setCellValue(report.getDistrict() != null ? report.getDistrict() : "");
                row.createCell(5).setCellValue(report.getReportStatus() != null ? statusTurkish(report.getReportStatus().name()) : "");
                row.createCell(6).setCellValue(nullToEmpty(report.getAiPriority()));
                row.createCell(7).setCellValue(nullToEmpty(report.getAiSummary()));
                row.createCell(8).setCellValue(report.getReporter() != null ? report.getReporter().getFullName() : "");
                row.createCell(9).setCellValue(report.getAssignee() != null ? report.getAssignee().getFullName() : "");
                row.createCell(10).setCellValue(report.getCreatedAt() != null ? report.getCreatedAt().toString() : "");
                row.createCell(11).setCellValue(report.getUpdatedAt() != null ? report.getUpdatedAt().toString() : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                if (sheet.getColumnWidth(i) > 15000) {
                    sheet.setColumnWidth(i, 15000);
                }
            }
            sheet.createFreezePane(0, 1);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private byte[] buildPdf(List<Report> reports) throws IOException {
        Document document = new Document(PageSize.A4.rotate(), 36, 36, 48, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);
        document.open();

        com.lowagie.text.Font titleFont = pdfFont(18, com.lowagie.text.Font.BOLD);
        titleFont.setColor(new java.awt.Color(15, 23, 42)); // Slate 900
        com.lowagie.text.Font metaFont = pdfFont(9, com.lowagie.text.Font.NORMAL);
        metaFont.setColor(java.awt.Color.GRAY);

        Paragraph title = new Paragraph("Kentiva — Belediye Bildirim Denetim Raporu", titleFont);
        title.setSpacingAfter(4);
        document.add(title);
        
        String formattedDate = java.time.LocalDateTime.now().toString().substring(0, 19).replace('T', ' ');
        document.add(new Paragraph("Rapor Oluşturma Tarihi: " + formattedDate + "  |  Toplam Kayıt Sayısı: " + reports.size(), metaFont));
        
        // Add a line divider
        PdfPTable divider = new PdfPTable(1);
        divider.setWidthPercentage(100);
        divider.setSpacingBefore(10);
        divider.setSpacingAfter(15);
        PdfPCell divCell = new PdfPCell();
        divCell.setBorder(com.lowagie.text.Rectangle.BOTTOM);
        divCell.setBorderWidth(1.5f);
        divCell.setBorderColor(new java.awt.Color(15, 23, 42)); // Slate 900 line
        divider.addCell(divCell);
        document.add(divider);

        PdfPTable table = new PdfPTable(8);
        table.setWidthPercentage(100);
        // Genişlikler: Başlık ve AI Özetine daha fazla yer ayırıyoruz
        table.setWidths(new float[]{3.2f, 2.0f, 1.5f, 1.2f, 1.2f, 3.0f, 2.0f, 1.8f});

        String[] headers = {"Başlık", "Kategori", "İlçe", "Durum", "Öncelik", "AI Özeti", "Raporlayan", "Tarih"};
        com.lowagie.text.Font headerFont = pdfFont(9, com.lowagie.text.Font.BOLD);
        headerFont.setColor(java.awt.Color.WHITE);

        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(new java.awt.Color(15, 23, 42)); // Slate 900 dark header
            cell.setPadding(8);
            cell.setBorderColor(new java.awt.Color(51, 65, 85)); // Slate 700 borders
            cell.setHorizontalAlignment(h.equals("Durum") || h.equals("Öncelik") ? 1 : 0); // Center status/priority
            table.addCell(cell);
        }

        com.lowagie.text.Font cellFont = pdfFont(8, com.lowagie.text.Font.NORMAL);
        int rowIdx = 0;
        for (Report report : reports) {
            java.awt.Color rowBgColor = (rowIdx % 2 == 0) ? new java.awt.Color(248, 250, 252) : java.awt.Color.WHITE;

            table.addCell(cell(report.getTitle(), cellFont, rowBgColor));
            table.addCell(cell(report.getCategory() != null ? report.getCategory().getName() : "", cellFont, rowBgColor));
            table.addCell(cell(nullToEmpty(report.getDistrict()), cellFont, rowBgColor));
            
            // Styled status badge-like cell
            table.addCell(statusCell(report.getReportStatus() != null ? report.getReportStatus().name() : null, rowBgColor));
            
            // Styled priority badge-like cell
            table.addCell(priorityCell(report.getAiPriority(), rowBgColor));
            
            table.addCell(cell(truncate(report.getAiSummary(), 100), cellFont, rowBgColor));
            table.addCell(cell(report.getReporter() != null ? report.getReporter().getFullName() : "", cellFont, rowBgColor));
            table.addCell(cell(report.getCreatedAt() != null ? report.getCreatedAt().toString().substring(0, 16).replace('T', ' ') : "", cellFont, rowBgColor));

            rowIdx++;
        }

        document.add(table);
        document.close();
        return out.toByteArray();
    }

    private static com.lowagie.text.Font pdfFont(float size, int style) {
        try {
            BaseFont base = BaseFont.createFont(BaseFont.HELVETICA, "Cp1254", BaseFont.NOT_EMBEDDED);
            return new com.lowagie.text.Font(base, size, style);
        } catch (Exception e) {
            return FontFactory.getFont(FontFactory.HELVETICA, size, style);
        }
    }

    private static PdfPCell cell(String text, com.lowagie.text.Font font, java.awt.Color bgColor) {
        PdfPCell c = new PdfPCell(new Phrase(text != null ? text : "", font));
        c.setPadding(6);
        c.setBackgroundColor(bgColor);
        c.setBorderColor(new java.awt.Color(226, 232, 240)); // Lighter borders (Slate 200)
        return c;
    }

    private static PdfPCell statusCell(String status, java.awt.Color defaultBgColor) {
        String trStatus = statusTurkish(status != null ? status : "");
        java.awt.Color bgColor = defaultBgColor;
        java.awt.Color textColor = new java.awt.Color(51, 65, 85); // Slate 700 default
        int style = com.lowagie.text.Font.NORMAL;

        if (status != null) {
            switch (status) {
                case "PENDING":
                    bgColor = new java.awt.Color(254, 243, 199); // Amber 100
                    textColor = new java.awt.Color(146, 64, 14); // Amber 800
                    style = com.lowagie.text.Font.BOLD;
                    break;
                case "PROCESSING":
                    bgColor = new java.awt.Color(219, 234, 254); // Blue 100
                    textColor = new java.awt.Color(30, 64, 175); // Blue 800
                    style = com.lowagie.text.Font.BOLD;
                    break;
                case "RESOLVED":
                    bgColor = new java.awt.Color(220, 252, 231); // Green 100
                    textColor = new java.awt.Color(22, 101, 52); // Green 800
                    style = com.lowagie.text.Font.BOLD;
                    break;
                case "REJECTED":
                    bgColor = new java.awt.Color(254, 226, 226); // Red 100
                    textColor = new java.awt.Color(153, 27, 27); // Red 800
                    style = com.lowagie.text.Font.BOLD;
                    break;
                case "FORWARDED":
                    bgColor = new java.awt.Color(243, 244, 246); // Gray 100
                    textColor = new java.awt.Color(55, 65, 81); // Gray 800
                    style = com.lowagie.text.Font.BOLD;
                    break;
            }
        }

        com.lowagie.text.Font font = pdfFont(8, style);
        font.setColor(textColor);
        
        PdfPCell c = new PdfPCell(new Phrase(trStatus, font));
        c.setPadding(6);
        c.setBackgroundColor(bgColor);
        c.setBorderColor(new java.awt.Color(226, 232, 240));
        c.setHorizontalAlignment(1); // Center alignment
        return c;
    }

    private static PdfPCell priorityCell(String priority, java.awt.Color defaultBgColor) {
        java.awt.Color bgColor = defaultBgColor;
        java.awt.Color textColor = new java.awt.Color(75, 85, 99); // Gray 600 default
        int style = com.lowagie.text.Font.NORMAL;

        if (priority != null) {
            switch (priority.toUpperCase()) {
                case "CRITICAL":
                    bgColor = new java.awt.Color(254, 226, 226); // Red 100
                    textColor = new java.awt.Color(153, 27, 27); // Red 800
                    style = com.lowagie.text.Font.BOLD;
                    break;
                case "HIGH":
                    bgColor = new java.awt.Color(255, 237, 213); // Orange 100
                    textColor = new java.awt.Color(194, 65, 12); // Orange 700
                    style = com.lowagie.text.Font.BOLD;
                    break;
                case "MEDIUM":
                    bgColor = new java.awt.Color(254, 243, 199); // Amber 100
                    textColor = new java.awt.Color(180, 83, 9); // Amber 700
                    break;
                case "LOW":
                    bgColor = new java.awt.Color(243, 244, 246); // Gray 100
                    textColor = new java.awt.Color(107, 114, 128); // Gray 500
                    break;
            }
        }

        com.lowagie.text.Font font = pdfFont(8, style);
        font.setColor(textColor);
        
        PdfPCell c = new PdfPCell(new Phrase(priority != null ? priority : "", font));
        c.setPadding(6);
        c.setBackgroundColor(bgColor);
        c.setBorderColor(new java.awt.Color(226, 232, 240));
        c.setHorizontalAlignment(1); // Center alignment
        return c;
    }

    private static String statusTurkish(String status) {
        return switch (status) {
            case "PENDING" -> "Bekliyor";
            case "PROCESSING" -> "İşleniyor";
            case "RESOLVED" -> "Çözüldü";
            case "REJECTED" -> "Reddedildi";
            case "FORWARDED" -> "Yönlendirildi";
            default -> status;
        };
    }

    private static String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "…";
    }

    private static String nullToEmpty(String s) {
        return s != null ? s : "";
    }
}
