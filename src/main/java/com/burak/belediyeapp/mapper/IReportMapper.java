package com.burak.belediyeapp.mapper;

import com.burak.belediyeapp.dto.request.report.CreateReportRequest;
import com.burak.belediyeapp.dto.response.report.ReportListResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportMedia;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.Collections;
import java.util.List;

@Mapper(componentModel = "spring", builder = @Builder(disableBuilder = true))
public interface IReportMapper {

    // ==========================================
    // 1. Entity → ReportResponse (detay görünüm)
    // ==========================================
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "reporterFullName",
            expression = "java(report.getReporter() != null ? report.getReporter().getFirstName() + \" \" + report.getReporter().getLastName() : null)")
    @Mapping(target = "assigneeFullName",
            expression = "java(report.getAssignee() != null ? report.getAssignee().getFirstName() + \" \" + report.getAssignee().getLastName() : null)")
    @Mapping(target = "latitude", source = "location.y")
    @Mapping(target = "longitude", source = "location.x")
    @Mapping(target = "status", source = "reportStatus")
    @Mapping(target = "mediaUrls", source = "mediaList", qualifiedByName = "mediaListToUrls")
    @Mapping(target = "duplicateGroupSize", ignore = true)
    ReportResponse toResponse(Report report);

    // ==========================================
    // 2. Entity → ReportListResponse (liste görünüm)
    // ==========================================
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "latitude", source = "location.y")
    @Mapping(target = "longitude", source = "location.x")
    @Mapping(target = "status", source = "reportStatus")
    @Mapping(target = "aiPriority", source = "aiPriority")
    @Mapping(target = "duplicateGroupSize", ignore = true)
    ReportListResponse toListResponse(Report report);

    // ==========================================
    // 3. CreateReportRequest → Entity
    // ==========================================
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "reportStatus", ignore = true)
    @Mapping(target = "reporter", ignore = true)
    @Mapping(target = "assignee", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "mediaList", ignore = true)
    @Mapping(target = "historyList", ignore = true)
    @Mapping(target = "municipality", ignore = true)
    @Mapping(target = "fcmToken", ignore = true)
    @Mapping(target = "aiPriority", ignore = true)
    @Mapping(target = "aiSummary", ignore = true)
    @Mapping(target = "aiSuggestedCategory", ignore = true)
    @Mapping(target = "aiSlaRisk", ignore = true)
    @Mapping(target = "aiReplyDraft", ignore = true)
    @Mapping(target = "aiDuplicateHint", ignore = true)
    @BeanMapping(ignoreUnmappedSourceProperties = {"categoryId", "mediaUrls", "latitude", "longitude", "targetMunicipalityId"})
    @Mapping(target = "location", source = "request", qualifiedByName = "coordinatesToPoint")
    Report toEntity(CreateReportRequest request);

    // ==========================================
    // 4. Custom: Koordinat → JTS Point
    // ==========================================
    @Named("coordinatesToPoint")
    default Point mapCoordinatesToPoint(CreateReportRequest request) {
        if (request.latitude() == null || request.longitude() == null) {
            return null;
        }
        // 4326 = WGS84 GPS koordinat sistemi
        // DİKKAT: Coordinate(x=boylam, y=enlem) sıralaması
        GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        return geometryFactory.createPoint(new Coordinate(request.longitude(), request.latitude()));
    }

    @Named("mediaListToUrls")
    default List<String> mapMediaListToUrls(List<ReportMedia> mediaList) {
        if (mediaList == null || mediaList.isEmpty()) {
            return Collections.emptyList();
        }
        return mediaList.stream()
                .map(ReportMedia::getImageUrl)
                .toList();
    }
}