package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "municipality_api_keys")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MunicipalityApiKey extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "municipality_id", nullable = false)
    private Municipality municipality;

    @Column(nullable = false, length = 120)
    private String name;

    /** İlk 12 karakter — aktif anahtar araması için */
    @Column(name = "key_prefix", nullable = false, length = 16)
    private String keyPrefix;

    @Column(name = "key_hash", nullable = false, length = 64)
    private String keyHash;

    /** Virgülle ayrılmış kapsamlar: reports:read */
    @Column(nullable = false, length = 255)
    private String scopes;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;
}
