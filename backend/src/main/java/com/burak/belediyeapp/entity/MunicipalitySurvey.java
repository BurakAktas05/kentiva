package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

@Entity
@Table(name = "municipality_surveys")
@SQLDelete(sql = "UPDATE municipality_surveys SET deleted = true WHERE id = ?")
@Where(clause = "deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MunicipalitySurvey extends BaseEntity implements TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "municipality_id", nullable = false)
    private Municipality municipality;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 150)
    private String option1;

    @Column(nullable = false, length = 150)
    private String option2;

    @Column(length = 150)
    private String option3;

    @Column(length = 150)
    private String option4;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String category = "Genel";

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;
}
