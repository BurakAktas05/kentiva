package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Denetim günlüğü (Audit Log) entity.
 * Sistemde yapılan tüm kritik işlemleri kaydeder.
 * Belediye denetim kurulları ve raporlama için zorunludur.
 */
@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_user", columnList = "username"),
        @Index(name = "idx_audit_action", columnList = "action"),
        @Index(name = "idx_audit_created", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** İşlemi yapan kullanıcının email adresi */
    @Column(nullable = false, length = 150)
    private String username;

    /** İşlemi yapan kullanıcının ID'si (null olabilir — anonim) */
    @Column(length = 36)
    private String userId;

    /** Yapılan işlem kodu: REPORT_CREATE, REPORT_STATUS_UPDATE, USER_CREATE vb. */
    @Column(nullable = false, length = 80)
    private String action;

    /** İşlemin açıklaması */
    @Column(columnDefinition = "TEXT")
    private String description;

    /** İşlemin yapıldığı metod adı */
    @Column(length = 200)
    private String methodName;

    /** İşlem sonucu dönen nesne özeti (JSON veya kısa metin) */
    @Column(columnDefinition = "TEXT")
    private String resultSummary;

    /** İstek yapan IP adresi */
    @Column(length = 50)
    private String ipAddress;

    /** İşlemin ait olduğu belediye (tenant) */
    @Column(length = 36)
    private String municipalityId;

    /** İlişkili varlık kimliği (ör. rapor UUID) */
    @Column(length = 36)
    private String entityId;

    /** Kayıt zamanı */
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
