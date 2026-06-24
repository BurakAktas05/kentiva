package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_redeemed_rewards")
@AttributeOverrides({
    @AttributeOverride(name = "createdAt", column = @Column(name = "redeemed_at"))
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRedeemedReward extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reward_id", nullable = false)
    private MunicipalityReward reward;

    @Column(name = "redemption_code", nullable = false, unique = true, length = 50)
    private String redemptionCode;

    @Column(nullable = false, length = 30)
    private String status; // 'REDEEMED', 'CLAIMED', 'CANCELLED'
}
