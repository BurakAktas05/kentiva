package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "starred_routes", uniqueConstraints = {
    @UniqueConstraint(name = "uq_starred_routes_user_route", columnNames = {"user_id", "route_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarredRoute extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    private BusRoute route;
}
