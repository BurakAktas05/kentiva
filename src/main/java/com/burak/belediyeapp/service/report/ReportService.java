package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.dto.request.report.*;
import com.burak.belediyeapp.dto.response.report.BulkReportOperationResult;
import com.burak.belediyeapp.dto.response.report.NearbyReportHintResponse;
import com.burak.belediyeapp.dto.response.report.ReportListResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.dto.response.report.ReportTimelineEntryResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.ReportStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Rapor use-case facade — detaylı mantık alt servislerde.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportCreationService creationService;
    private final ReportQueryService queryService;
    private final ReportCommandService commandService;

    public ReportResponse createReport(CreateReportRequest request, AppUser reporter) {
        return creationService.createReport(request, reporter);
    }

    public Page<ReportListResponse> getMyReports(AppUser user, Pageable pageable) {
        return queryService.getMyReports(user, pageable);
    }

    public Page<ReportListResponse> getAllReports(AppUser user, Pageable pageable) {
        return queryService.getAllReports(user, pageable);
    }

    public Page<ReportListResponse> getReportsByStatus(ReportStatus status, AppUser user, Pageable pageable) {
        return queryService.getReportsByStatus(status, user, pageable);
    }

    public Page<ReportListResponse> getReportsByDepartment(String departmentId, AppUser user, Pageable pageable) {
        return queryService.getReportsByDepartment(departmentId, user, pageable);
    }

    public ReportResponse getReportById(String reportId, AppUser currentUser) {
        return queryService.getReportById(reportId, currentUser);
    }

    public List<ReportTimelineEntryResponse> getReportTimeline(String reportId, AppUser currentUser) {
        return queryService.getReportTimeline(reportId, currentUser);
    }

    public List<ReportListResponse> getDuplicateGroupMembers(String reportId, AppUser currentUser) {
        return queryService.getDuplicateGroupMembers(reportId, currentUser);
    }

    public Page<ReportListResponse> getMyAssignments(AppUser user, Pageable pageable) {
        return queryService.getMyAssignments(user, pageable);
    }

    public ReportResponse updateReportStatus(String reportId, UpdateReportStatusRequest request, AppUser currentUser) {
        return commandService.updateReportStatus(reportId, request, currentUser);
    }

    public ReportResponse assignReport(String reportId, AssignReportRequest request, AppUser assignedBy) {
        return commandService.assignReport(reportId, request, assignedBy);
    }

    public ReportResponse forwardReportToDepartment(
            String reportId, com.burak.belediyeapp.dto.request.report.ForwardReportRequest request, AppUser currentUser) {
        return commandService.forwardReportToDepartment(reportId, request, currentUser);
    }

    public BulkReportOperationResult bulkAssignReports(BulkAssignReportsRequest request, AppUser assignedBy) {
        return commandService.bulkAssignReports(request, assignedBy);
    }

    public BulkReportOperationResult bulkUpdateReportStatus(
            BulkUpdateReportStatusRequest request, AppUser currentUser) {
        return commandService.bulkUpdateReportStatus(request, currentUser);
    }

    public List<NearbyReportHintResponse> getNearbyHintsForCitizen(
            double latitude, double longitude, String municipalityId, double radiusMeters,
            AppUser currentUser) {
        return queryService.getNearbyHintsForCitizen(
                latitude, longitude, municipalityId, radiusMeters, currentUser);
    }

    public List<ReportListResponse> getNearbyReports(
            double latitude, double longitude, double radiusMeters, AppUser currentUser) {
        return queryService.getNearbyReports(latitude, longitude, radiusMeters, currentUser);
    }

    /** Admin / saha ekibi tarafından elle tetiklenen AI analizi (IDOR korumalı). */
    public void performAiAnalysis(String reportId, AppUser currentUser) {
        commandService.performAiAnalysis(reportId, currentUser);
    }

    /** Sistem (event listener) tarafından otomatik AI analizi — admin oturumu yok. */
    public void performAiAnalysisAsSystem(String reportId) {
        commandService.performAiAnalysisAsSystem(reportId);
    }

    /**
     * Sistem tarafından otomatik red — media-guard async pipeline için.
     * Human admin yetkisi gerektirmez; internal kullanım içindir.
     */
    public void systemRejectReport(String reportId, String reason) {
        commandService.systemRejectReport(reportId, reason);
    }

    public void suspendReporterOfReport(String reportId) {
        commandService.suspendReporterOfReport(reportId);
    }
}
