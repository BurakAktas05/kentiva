package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Polygon;

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

    /**
     * Belediyenin sınırları (opsiyonel).
     * WGS84 (SRID 4326) formatında.
     */
    @Column(columnDefinition = "geometry(Polygon,4326)")
    private Polygon boundaries;
}
