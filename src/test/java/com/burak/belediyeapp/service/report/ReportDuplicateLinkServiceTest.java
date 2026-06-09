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
        ReflectionTestUtils.setField(reportDuplicateLinkService, "radiusMeters", 75.0);
    }

    @Test
    void whenLocationIsNull_doesNothing() {
        Report report = new Report();
        reportDuplicateLinkService.linkNearbyDuplicates(report);
        verify(reportRepository, never()).findActiveNearbyInMunicipality(anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), anyInt());
    }

    @Test
    void whenNoNearbyReports_doesNothing() {
        Report report = createReport("r-new", 41.25, 32.69);
        when(reportRepository.findActiveNearbyInMunicipality(anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), anyInt()))
                .thenReturn(List.of());

        reportDuplicateLinkService.linkNearbyDuplicates(report);

        verify(geminiService, never()).findDuplicateReports(any(), any());
        verify(reportRepository, never()).saveAll(any());
    }

    @Test
    void whenGeminiReturnsNull_fallsBackToDistanceBasedGrouping() {
        Report report = createReport("r-new", 41.25, 32.69);
        Report nearby1 = createReport("r-near1", 41.2501, 32.6901);
        Report nearby2 = createReport("r-near2", 41.2502, 32.6902);

        when(reportRepository.findActiveNearbyInMunicipality(anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), anyInt()))
                .thenReturn(List.of(nearby1, nearby2));
        when(geminiService.findDuplicateReports(report, List.of(nearby1, nearby2)))
                .thenReturn(null); // Indicates fallback/failure

        reportDuplicateLinkService.linkNearbyDuplicates(report);

        // Under fallback, all nearby are linked
        verify(reportRepository).saveAll(any());
    }

    @Test
    void whenGeminiReturnsMatches_linksOnlyMatches() {
        Report report = createReport("r-new", 41.25, 32.69);
        Report nearby1 = createReport("r-near1", 41.2501, 32.6901);
        Report nearby2 = createReport("r-near2", 41.2502, 32.6902);

        when(reportRepository.findActiveNearbyInMunicipality(anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), anyInt()))
                .thenReturn(List.of(nearby1, nearby2));
        when(geminiService.findDuplicateReports(report, List.of(nearby1, nearby2)))
                .thenReturn(List.of("r-near1")); // Only nearby1 matches

        reportDuplicateLinkService.linkNearbyDuplicates(report);

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

        when(reportRepository.findActiveNearbyInMunicipality(anyDouble(), anyDouble(), anyDouble(), anyString(), anyString(), anyInt()))
                .thenReturn(List.of(nearby1));
        when(geminiService.findDuplicateReports(report, List.of(nearby1)))
                .thenReturn(List.of()); // No matches found by Gemini

        reportDuplicateLinkService.linkNearbyDuplicates(report);

        verify(reportRepository, never()).saveAll(any());
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
