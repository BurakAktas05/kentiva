package com.burak.belediyeapp.service.export;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IReportRepository;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.FontFactory;
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
import org.apache.poi.ss.usermodel.Font;
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
            Font headerFont = workbook.createFont();
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

        com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        com.lowagie.text.Font metaFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
        Paragraph title = new Paragraph("Kentiva — Rapor Dışa Aktarım", titleFont);
        title.setSpacingAfter(4);
        document.add(title);
        document.add(new Paragraph("Oluşturulma: " + java.time.LocalDateTime.now(), metaFont));
        document.add(new Paragraph("Kayıt sayısı: " + reports.size(), metaFont));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(8);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2.2f, 2.5f, 1.5f, 1.2f, 1.2f, 1f, 2.5f, 1.8f});

        String[] headers = {"Başlık", "Kategori", "İlçe", "Durum", "Öncelik", "Özet", "Raporlayan", "Tarih"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
            cell.setBackgroundColor(new Color(230, 236, 245));
            cell.setPadding(6);
            table.addCell(cell);
        }

        com.lowagie.text.Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 8);
        for (Report report : reports) {
            table.addCell(cell(report.getTitle(), cellFont));
            table.addCell(cell(report.getCategory() != null ? report.getCategory().getName() : "", cellFont));
            table.addCell(cell(nullToEmpty(report.getDistrict()), cellFont));
            table.addCell(cell(report.getReportStatus() != null ? statusTurkish(report.getReportStatus().name()) : "", cellFont));
            table.addCell(cell(nullToEmpty(report.getAiPriority()), cellFont));
            table.addCell(cell(truncate(report.getAiSummary(), 80), cellFont));
            table.addCell(cell(report.getReporter() != null ? report.getReporter().getFullName() : "", cellFont));
            table.addCell(cell(report.getCreatedAt() != null ? report.getCreatedAt().toString() : "", cellFont));
        }

        document.add(table);
        document.close();
        return out.toByteArray();
    }

    private static PdfPCell cell(String text, com.lowagie.text.Font font) {
        PdfPCell c = new PdfPCell(new Phrase(text != null ? text : "", font));
        c.setPadding(4);
        return c;
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

    private static String nullToEmpty(String s) {
        return s != null ? s : "";
    }
}
