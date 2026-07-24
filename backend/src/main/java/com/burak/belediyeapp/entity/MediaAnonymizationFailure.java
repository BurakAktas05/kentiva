package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Başarısız KVKK görsel anonimleştirme işlemlerini (Dead Letter Queue) takip eder.
 * Periyodik olarak yeniden denenip çözülmeyi bekler.
 */
@Entity
@Table(name = "media_anonymization_failures")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaAnonymizationFailure extends BaseEntity {

    /** Başarısız olan görselin ait olduğu rapor ID'si. */
    @Column(name = "report_id", nullable = false, length = 36)
    private String reportId;

    /** Başarısız olan görselin URL/yolu. */
    @Column(name = "image_url", nullable = false, length = 1024)
    private String imageUrl;

    /** Hata mesajı. */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /** Kaç kez yeniden denendi. */
    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private int retryCount = 0;

    /** Son deneme zamanı. */
    @Column(name = "last_attempt_at")
    private LocalDateTime lastAttemptAt;

    /** İşlem çözüldü mü (başarılı retry veya manuel müdahale). */
    @Column(name = "resolved", nullable = false)
    @Builder.Default
    private boolean resolved = false;

    /** Çözüm zamanı. */
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    /** Maksimum retry sayısına ulaşıldı mı — manuel inceleme gerektirir. */
    @Column(name = "max_retries_exceeded", nullable = false)
    @Builder.Default
    private boolean maxRetriesExceeded = false;
}
