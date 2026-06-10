package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * JWT Refresh Token — access token süresi dolduğunda yenilemek için kullanılır.
 * Her kullanıcıya bir refresh token atanır; yenileme sonrasında eski token
 * geçersiz kılınır (rotation stratejisi).
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken extends BaseEntity {

    /**
     * Token değeri. UUID veya kriptografik olarak üretilmiş string.
     */
    @Column(nullable = false, unique = true, columnDefinition = "text")
    private String token;

    /**
     * Token'in son kullanma tarihi.
     */
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    /**
     * Token iptal edildi mi? (logout veya rotation sonrası)
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    /**
     * Token hangi kullanıcıya ait?
     * Bir kullanıcının birden fazla cihaz/session için token'ı olabilir.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return !revoked && !isExpired();
    }
}
