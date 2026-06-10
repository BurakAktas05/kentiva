package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "export_schedules")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExportSchedule extends BaseEntity implements TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "municipality_id", nullable = false)
    private Municipality municipality;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private AppUser createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private ExportFormat format = ExportFormat.EXCEL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private ExportFrequency frequency = ExportFrequency.DAILY;

    @Column(name = "hour_of_day", nullable = false)
    @Builder.Default
    private int hourOfDay = 6;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    private LocalDateTime lastRunAt;

    public enum ExportFormat {
        EXCEL, PDF
    }

    public enum ExportFrequency {
        DAILY, WEEKLY, MONTHLY
    }
}
