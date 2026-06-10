package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Kullanıcı bildirimlerini saklar.
 * Rapor durumu değiştiğinde vatandaşa, yeni atama olduğunda saha ekibine
 * bildirim gönderilir ve burada kaydedilir.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    /**
     * Bildirim tipi: REPORT_STATUS_CHANGED, REPORT_ASSIGNED, SYSTEM_MESSAGE
     */
    @Column(nullable = false, length = 50)
    private String type;

    /**
     * Okundu mu?
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean read = false;

    /**
     * İlgili raporun ID'si (opsiyonel). Bildirime tıklandığında yönlendirme için.
     */
    @Column
    private String reportId;

    /**
     * Bildirimi alacak kullanıcı.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;
}
