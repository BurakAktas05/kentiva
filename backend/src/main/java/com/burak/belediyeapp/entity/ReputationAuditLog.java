package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Vatandaşların güven/itibar puanı (Reputation Score) değişim geçmişini tutan denetim log tablosu.
 */
@Entity
@Table(name = "reputation_audit_logs", indexes = {
        @Index(name = "idx_reputation_audit_logs_user", columnList = "user_id"),
        @Index(name = "idx_reputation_audit_logs_created_at", columnList = "created_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReputationAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "previous_score", nullable = false)
    private int previousScore;

    @Column(name = "new_score", nullable = false)
    private int newScore;

    @Column(nullable = false)
    private int delta;

    @Column(nullable = false, length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
