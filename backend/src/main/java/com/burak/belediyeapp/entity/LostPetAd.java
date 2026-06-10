package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "lost_pet_ads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LostPetAd {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "pet_name", nullable = false, length = 100)
    private String petName;

    @Column(name = "pet_type", nullable = false, length = 50)
    private String petType;

    @Column(length = 100)
    private String breed;

    @Column(name = "last_seen_district", nullable = false, length = 100)
    private String lastSeenDistrict;

    @Column(name = "contact_phone", nullable = false, length = 30)
    private String contactPhone;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "media_url", length = 500)
    private String mediaUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
