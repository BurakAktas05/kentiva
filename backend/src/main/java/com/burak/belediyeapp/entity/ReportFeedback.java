package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Entity
@Table(name = "report_feedbacks")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportFeedback extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false, unique = true)
    private Report report;

    @Column(nullable = false)
    private int rating;

    @Column(length = 500)
    private String comment;
}
