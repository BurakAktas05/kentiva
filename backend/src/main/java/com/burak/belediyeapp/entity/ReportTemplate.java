package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Vatandaş bildirim formunda hızlı seçim için kategori + örnek açıklama şablonu.
 * {@code municipality} null ise sistem varsayılanı; dolu ise belediye özelleştirmesi.
 */
@Entity
@Table(name = "report_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportTemplate extends BaseEntity implements TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "municipality_id")
    private Municipality municipality;

    @Column(name = "template_key", nullable = false, length = 50)
    private String templateKey;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "description_template", nullable = false, columnDefinition = "TEXT")
    private String descriptionTemplate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private ReportCategory category;

    @Column(length = 50)
    private String iconCode;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
