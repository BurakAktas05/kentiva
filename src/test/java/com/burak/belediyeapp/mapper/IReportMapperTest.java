package com.burak.belediyeapp.mapper;

import com.burak.belediyeapp.dto.request.report.CreateReportRequest;
import com.burak.belediyeapp.entity.Report;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Point;
import org.mapstruct.factory.Mappers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class IReportMapperTest {

    private final IReportMapper mapper = Mappers.getMapper(IReportMapper.class);

    @Test
    void mapsLatitudeAndLongitudeToWgs84PointInCorrectOrder() {
        CreateReportRequest request = new CreateReportRequest(
                "Yolda büyük çukur",
                "Mahalle girişinde araçlara zarar veren büyük bir çukur var.",
                "category-1",
                41.015,
                29.123,
                "Kadıköy",
                List.of("https://example.com/image.jpg"),
                null
        );

        Report report = mapper.toEntity(request);
        Point point = report.getLocation();

        assertThat(point.getSRID()).isEqualTo(4326);
        assertThat(point.getY()).isEqualTo(41.015);
        assertThat(point.getX()).isEqualTo(29.123);
    }
}
