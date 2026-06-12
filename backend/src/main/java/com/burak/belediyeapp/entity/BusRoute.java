package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

@Entity
@Table(name = "bus_routes")
@SQLDelete(sql = "UPDATE bus_routes SET deleted = true WHERE id = ?")
@Where(clause = "deleted = false")
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

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;
}
