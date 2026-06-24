package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.MultiPolygon;

@Getter
@Setter
@Entity
@Table(name = "turkey_provinces")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TurkeyProvince {

    @Id
    @Column(name = "plate_code", length = 10)
    private String plateCode;

    @Column(name = "name_tr", nullable = false, length = 100)
    private String nameTr;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(columnDefinition = "geometry(MultiPolygon,4326)")
    private MultiPolygon boundaries;
}
