package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Point;

@Getter
@Setter
@Entity
@Table(name = "turkey_districts")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TurkeyDistrict {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false, unique = true, length = 150)
    private String memberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plate_code", nullable = false)
    private TurkeyProvince province;

    @Column(name = "district_slug", nullable = false, length = 100)
    private String districtSlug;

    @Column(name = "name_tr", nullable = false, length = 100)
    private String nameTr;

    @Column(columnDefinition = "geometry(MultiPolygon,4326)")
    private MultiPolygon boundaries;

    @Column(name = "osm_id")
    private Long osmId;

    @Column(columnDefinition = "geometry(Point,4326)")
    private Point centroid;

    @Column(name = "boundary_status", nullable = false, length = 50)
    private String boundaryStatus;
}
