package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Entity
@Table(name = "system_feedbacks")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemFeedback extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false)
    private int rating;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 20)
    private String sentiment;

    @Column(length = 50)
    private String category;
}
