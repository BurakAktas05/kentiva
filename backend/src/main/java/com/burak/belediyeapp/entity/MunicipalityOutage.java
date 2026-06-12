package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "municipality_outages")
@SQLDelete(sql = "UPDATE municipality_outages SET deleted = true WHERE id = ?")
@Where(clause = "deleted = false")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MunicipalityOutage extends BaseEntity implements TenantAware {

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

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;
}
