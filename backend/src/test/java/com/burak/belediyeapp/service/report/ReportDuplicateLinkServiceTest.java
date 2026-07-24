package com.burak.belediyeapp.service.report;

import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.service.ai.GeminiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportDuplicateLinkServiceTest {

    @Mock
    private IReportRepository reportRepository;

    @Mock
    private GeminiService geminiService;

    @InjectMocks
    private ReportDuplicateLinkService reportDuplicateLinkService;

    private GeometryFactory geometryFactory = new GeometryFactory();

    @BeforeEach
    void setUp() {
        org.springframework.test.util.ReflectionTestUtils.setField(reportDuplicateLinkService, "radiusMeters", 75.0);
        org.springframework.test.util.ReflectionTestUtils.setField(reportDuplicateLinkService, "strictThreshold", 0.12);
        org.springframework.test.util.ReflectionTestUtils.setField(reportDuplicateLinkService, "borderlineThreshold", 0.28);
        org.springframework.test.util.ReflectionTestUtils.setField(reportDuplicateLinkService, "maxRetries", 3);
        org.springframework.test.util.ReflectionTestUtils.setField(reportDuplicateLinkService, "self", reportDuplicateLinkService);
    }

    @Test
    void whenLocationIsNull_doesNothing() {
        Report report = new Report();
        report.setId("r-null");
        when(reportRepository.findById("r-null")).thenReturn(java.util.Optional.of(report));

        reportDuplicateLinkService.linkNearbyDuplicates("r-null");
        verify(reportRepository, never()).findActiveNearbyInMunicipality(anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), any(), anyInt());
    }

    @Test
    void whenNoNearbyReports_doesNothing() {
        Report report = createReport("r-new", 41.25, 32.69);
        when(reportRepository.findById("r-new")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.findActiveNearbyInMunicipality(anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of());

        reportDuplicateLinkService.linkNearbyDuplicates("r-new");

        verify(geminiService, never()).findDuplicateReports(any(), any());
        verify(reportRepository, never()).saveAll(any());
    }

    @Test
    void whenGeminiReturnsNull_fallsBackToDistanceBasedGrouping() {
        Report report = createReport("r-new", 41.25, 32.69);
        Report nearby1 = createReport("r-near1", 41.2501, 32.6901);
        Report nearby2 = createReport("r-near2", 41.2502, 32.6902);

        when(reportRepository.findById("r-new")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.findActiveNearbyInMunicipality(anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of(nearby1, nearby2));
        when(geminiService.findDuplicateReports(report, List.of(nearby1, nearby2)))
                .thenReturn(null); // Indicates fallback/failure
        when(reportRepository.findAllById(any())).thenReturn(List.of(report, nearby1, nearby2));

        reportDuplicateLinkService.linkNearbyDuplicates("r-new");

        // Under fallback, all nearby are linked
        verify(reportRepository).saveAll(any());
    }

    @Test
    void whenGeminiReturnsMatches_linksOnlyMatches() {
        Report report = createReport("r-new", 41.25, 32.69);
        Report nearby1 = createReport("r-near1", 41.2501, 32.6901);
        Report nearby2 = createReport("r-near2", 41.2502, 32.6902);

        when(reportRepository.findById("r-new")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.findActiveNearbyInMunicipality(anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of(nearby1, nearby2));
        when(geminiService.findDuplicateReports(report, List.of(nearby1, nearby2)))
                .thenReturn(List.of("r-near1")); // Only nearby1 matches
        when(reportRepository.findAllById(any())).thenReturn(List.of(report, nearby1));

        reportDuplicateLinkService.linkNearbyDuplicates("r-new");

        // Verify that saveAll is called with report and nearby1 (which are modified)
        verify(reportRepository).saveAll(argThat(iterable -> {
            java.util.List<Report> list = new java.util.ArrayList<>();
            iterable.forEach(list::add);
            return list.stream().anyMatch(r -> r.getId().equals("r-new")) &&
                   list.stream().anyMatch(r -> r.getId().equals("r-near1")) &&
                   list.stream().noneMatch(r -> r.getId().equals("r-near2"));
        }));
    }

    @Test
    void whenGeminiReturnsEmptyList_doesNotLink() {
        Report report = createReport("r-new", 41.25, 32.69);
        Report nearby1 = createReport("r-near1", 41.2501, 32.6901);

        when(reportRepository.findById("r-new")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.findActiveNearbyInMunicipality(anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of(nearby1));
        when(geminiService.findDuplicateReports(report, List.of(nearby1)))
                .thenReturn(List.of()); // No matches found by Gemini

        reportDuplicateLinkService.linkNearbyDuplicates("r-new");

        verify(reportRepository, never()).saveAll(any());
    }

    @Test
    void optimizedFlow_whenDuplicateAiIsUnavailable_skipsEmbeddingAndUsesFallback() {
        Report report = createReport("r-new", 41.25, 32.69);
        Report nearby = createReport("r-near", 41.2501, 32.6901);

        when(reportRepository.findById("r-new")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.findActiveNearbyInMunicipality(
                anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of(nearby));
        when(geminiService.isDuplicateDetectionAvailable()).thenReturn(false);
        when(geminiService.findDuplicateReports(report, List.of(nearby))).thenReturn(null);
        when(reportRepository.findAllById(any())).thenReturn(List.of(report, nearby));

        reportDuplicateLinkService.linkNearbyDuplicatesOptimized("r-new");

        verify(geminiService, never()).getEmbedding(any(), any());
        verify(reportRepository).saveAll(any());
    }

    @Test
    void optimizedFlow_whenEmbeddingIsEmpty_neverWritesInvalidVector() {
        Report report = createReport("r-new", 41.25, 32.69);

        when(reportRepository.findById("r-new")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.findActiveNearbyInMunicipality(
                anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of());
        when(geminiService.isDuplicateDetectionAvailable()).thenReturn(true);
        when(geminiService.getEmbedding(any(), any())).thenReturn(new double[0]);

        reportDuplicateLinkService.linkNearbyDuplicatesOptimized("r-new");

        verify(geminiService, times(1)).getEmbedding(any(), any());
        verify(reportRepository, never()).updateReportEmbedding(anyString(), anyString());
        verify(reportRepository, never()).findSemanticNearbyInMunicipality(
                anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), any(), anyString(), anyDouble(), anyInt());
    }

    private Report createReport(String id, double lat, double lng) {
        Report report = new Report();
        report.setId(id);
        Point point = geometryFactory.createPoint(new Coordinate(lng, lat));
        report.setLocation(point);

        Municipality municipality = new Municipality();
        municipality.setId("m1");
        report.setMunicipality(municipality);
        return report;
    }
}
