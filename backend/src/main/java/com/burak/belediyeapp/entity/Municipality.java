package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Polygon;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Temsil edilen belediyeleri (Büyükşehir, İlçe vb.) yönetmek için.
 */
@Getter
@Setter
@Entity
@Table(name = "municipalities")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Municipality extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MunicipalityType type;

    /**
     * Eğer bu bir ilçe belediyesi ise, bağlı olduğu büyükşehir belediyesi.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Municipality parentMunicipality;

    @OneToMany(mappedBy = "parentMunicipality", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Municipality> subMunicipalities = new ArrayList<>();

    @Column(nullable = false)
    @Builder.Default
    private Double centerLat = 41.0082; // İstanbul default

    @Column(nullable = false)
    @Builder.Default
    private Double centerLng = 28.9784; // İstanbul default

    @Column(nullable = false)
    @Builder.Default
    private Integer defaultZoom = 12;

    /**
     * Kentiva: URL ve API için benzersiz kısa ad (ör. m-abc123 veya kadikoy).
     */
    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    /**
     * Vatandaş arayüzünde gösterilen ad (boşsa {@link #name} kullanılır).
     */
    @Column(name = "display_name", length = 150)
    private String displayName;

    @Column(name = "logo_url", length = 512)
    private String logoUrl;

    @Column(name = "primary_color", length = 20)
    private String primaryColor;

    @Column(name = "secondary_color", length = 20)
    private String secondaryColor;

    @Column(name = "accent_color", length = 20)
    private String accentColor;

    @Column(length = 255)
    private String slogan;

    /** Çözülen ihbar SMS şablonu — {belediye}, {baslik}, {not}, {slogan} */
    @Column(name = "sms_resolved_template", columnDefinition = "TEXT")
    private String smsResolvedTemplate;

    @Column(name = "push_rejected_title_template", length = 200)
    private String pushRejectedTitleTemplate;

    @Column(name = "push_rejected_body_template", columnDefinition = "TEXT")
    private String pushRejectedBodyTemplate;

    @Column(name = "push_resolved_title_template", length = 200)
    private String pushResolvedTitleTemplate;

    @Column(name = "push_resolved_body_template", columnDefinition = "TEXT")
    private String pushResolvedBodyTemplate;


    /** NetGSM gönderici adı (belediye markası) */
    @Column(name = "sms_sender_header", length = 11)
    private String smsSenderHeader;

    @Column(name = "sms_processing_template", columnDefinition = "TEXT")
    private String smsProcessingTemplate;

    @Column(name = "push_processing_title_template", length = 200)
    private String pushProcessingTitleTemplate;

    @Column(name = "push_processing_body_template", columnDefinition = "TEXT")
    private String pushProcessingBodyTemplate;

    @Column(name = "sms_assigned_template", columnDefinition = "TEXT")
    private String smsAssignedTemplate;

    @Column(name = "push_assigned_title_template", length = 200)
    private String pushAssignedTitleTemplate;

    @Column(name = "push_assigned_body_template", columnDefinition = "TEXT")
    private String pushAssignedBodyTemplate;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    @Column(name = "website_url", length = 512)
    private String websiteUrl;

    @Column(name = "public_stats_enabled", nullable = false)
    @Builder.Default
    private boolean publicStatsEnabled = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Platformda aktif belediye (katılım) — false ise listede gri / yönlendirme.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean onboarded = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_plan", nullable = false, length = 32)
    @Builder.Default
    private SubscriptionPlan subscriptionPlan = SubscriptionPlan.TRIAL;

    @Column(name = "subscription_ends_at")
    private LocalDateTime subscriptionEndsAt;

    /**
     * Belediyenin sınırları (opsiyonel).
     * WGS84 (SRID 4326) formatında.
     */
    @Column(columnDefinition = "geometry(Polygon,4326)")
    private Polygon boundaries;

    /** ERP/CRM giden webhook hedef URL (https) */
    @Column(name = "webhook_url", length = 512)
    private String webhookUrl;

    @Column(name = "webhook_enabled", nullable = false)
    @Builder.Default
    private boolean webhookEnabled = false;

    /** HMAC imza için paylaşılan sır (X-BelediyeApp-Signature) */
    @Column(name = "webhook_secret", length = 64)
    private String webhookSecret;

    /** EczaneAPI il slug (örn. istanbul) — boşsa konumdan çözülür */
    @Column(name = "widget_city_slug", length = 80)
    private String widgetCitySlug;

    /** EczaneAPI ilçe slug (örn. kadikoy) */
    @Column(name = "widget_district_slug", length = 80)
    private String widgetDistrictSlug;

    @Enumerated(EnumType.STRING)
    @Column(name = "workflow_mode", nullable = false, length = 20)
    @Builder.Default
    private WorkflowMode workflowMode = WorkflowMode.SIMPLE;

    // ── MIS/EBYS entegrasyonu ───────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "mis_type", nullable = false, length = 30)
    @Builder.Default
    private MisIntegrationType misType = MisIntegrationType.NONE;

    @Column(name = "mis_url", length = 512)
    private String misUrl;

    @Column(name = "mis_api_key", length = 255)
    private String misApiKey;
}
