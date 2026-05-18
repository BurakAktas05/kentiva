package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "municipality_outages")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MunicipalityOutage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "municipality_id", nullable = false)
    private Municipality municipality;

    @Column(name = "outage_type", nullable = false, length = 20)
    private String outageType;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 100)
    private String district;

    @Column(columnDefinition = "TEXT")
    private String message;

    private LocalDateTime startsAt;
    private LocalDateTime endsAt;

    @Builder.Default
    private boolean active = true;
}
