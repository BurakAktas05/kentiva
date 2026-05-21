package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Point;

import java.util.ArrayList;
import java.util.List;

/**
 * Vatandaşların oluşturduğu alan raporlarını temsil eder.
 * (Çukur, çöp, park ihlali, vb.)
 *
 * Konum bilgisi JTS Point tipinde tutulur — PostGIS spatial sorguları
 * (yakın raporlar, ısı haritası vb.) için.
 */
@Getter
@Setter
@Entity
@Table(name = "reports")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report extends BaseEntity implements TenantAware {

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    /**
     * WGS84 (SRID 4326) koordinat sistemiyle GPS konumu.
     * x = boylam (longitude), y = enlem (latitude)
     */
    @Column(columnDefinition = "geometry(Point,4326)", nullable = false)
    private Point location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ReportStatus reportStatus = ReportStatus.PENDING;

    /**
     * Raporun kategorisi (Yol, Çevre, Park vb.)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private ReportCategory category;

    /**
     * Raporu oluşturan vatandaş.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private AppUser reporter;

    /**
     * Sorumlu saha ekibi üyesi. Atanana kadar null.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private AppUser assignee;

    /**
     * Rapora ek fotoğraf/video URL'leri.
     */
    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReportMedia> mediaList = new ArrayList<>();

    /**
     * Raporun ait olduğu ilçe (Kadıköy, Beşiktaş vb.)
     * Frontend'den koordinat bazlı tespit edilip gönderilir.
     */
    @Column(length = 100)
    private String district;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "municipality_id")
    private Municipality municipality;

    @Column(length = 255)
    private String fcmToken;

    @Column(length = 20)
    private String aiPriority;

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    @Column(length = 200)
    private String aiSuggestedCategory;

    @Column(length = 20)
    private String aiSlaRisk;

    @Column(columnDefinition = "TEXT")
    private String aiReplyDraft;

    @Column(length = 500)
    private String aiDuplicateHint;

    /** Aynı konumdan gelen aktif ihbarlar için paylaşılan grup kimliği. */
    @Column(length = 36)
    private String duplicateGroupId;

    /** Vatandaş rapor metninin dili (tr, en, ar) — bildirim ve yanıt taslağı için. */
    @Column(name = "content_language", nullable = false, length = 5)
    @Builder.Default
    private String contentLanguage = "tr";

    /** Beyaz Masa tarafından yönlendirilen departman (DEPARTMENTAL modda) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "forwarded_department_id")
    private Department forwardedDepartment;

    /** Yönlendirme zamanı */
    @Column(name = "forwarded_at")
    private java.time.LocalDateTime forwardedAt;

    /** Yönlendiren kullanıcı */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "forwarded_by_id")
    private AppUser forwardedBy;

    /** KVKK açık rıza onayı */
    @Column(name = "kvkk_approved", nullable = false)
    @Builder.Default
    private boolean kvkkApproved = false;

    @Column(name = "kvkk_approved_at")
    private java.time.LocalDateTime kvkkApprovedAt;

    /**
     * Durum değişikliği geçmişi — auditability için.
     */
    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL)
    @Builder.Default
    private List<ReportHistory> historyList = new ArrayList<>();
}
