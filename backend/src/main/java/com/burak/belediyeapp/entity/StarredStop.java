package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "starred_stops", uniqueConstraints = {
    @UniqueConstraint(name = "uq_starred_stops_user_stop_muni", columnNames = {"user_id", "stop_name", "municipality_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarredStop extends BaseEntity implements TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "stop_name", nullable = false)
    private String stopName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "municipality_id", nullable = false)
    private Municipality municipality;
}
