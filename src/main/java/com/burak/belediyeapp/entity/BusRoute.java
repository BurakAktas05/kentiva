package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bus_routes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusRoute extends BaseEntity implements TenantAware {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(name = "stops_json", nullable = false, columnDefinition = "TEXT")
    private String stopsJson;

    @Column(nullable = false, length = 50)
    private String color;

    @Column(nullable = false, length = 50)
    private String icon;

    @Column(name = "schedule_json", nullable = false, columnDefinition = "TEXT")
    private String scheduleJson;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "municipality_id", nullable = false)
    private Municipality municipality;
}
