package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Raporlara kategorik departman atamasını mümkün kılar.
 * Örn: "Yol Çukuru" kategorisi → "Yol Bakım Müdürlüğü" departmanına bağlı.
 */
@Entity
@Table(name = "report_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportCategory extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    /**
     * NULL = platform geneli kategori; dolu = yalnızca ilgili belediye.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "municipality_id")
    private Municipality municipality;

    @Column(length = 255)
    private String description;

    /**
     * İkon/renk bilgisi — mobil uygulama UI'ı için.
     */
    @Column(length = 50)
    private String iconCode;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Bu kategorideki raporları hangi departman alacak?
     * Null ise manuel atama yapılması gerekir.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;
}