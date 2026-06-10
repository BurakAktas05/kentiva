package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "report_media")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportMedia extends BaseEntity{

    @Column(nullable = false)
    private String imageUrl;

    @Column // Opsiyonel: Dosyayı silerken lazım olur
    private String publicId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id",nullable = false)
    private Report report;
}
