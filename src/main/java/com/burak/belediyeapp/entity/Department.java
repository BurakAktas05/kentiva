package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Belediye içindeki birimleri (Yol Bakım, Çevre, Park-Bahçe vb.) temsil eder.
 * Her kategoriye ve rapora bir departman bağlanabilir, böylece doğru ekip
 * otomatik olarak atanabilir (ilerleyen sürümde).
 */
@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department extends BaseEntity implements TenantAware {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 120)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "municipality_id")
    private Municipality municipality;

    @Column(length = 255)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Departmana ait kullanıcılar (field officer, department manager vb.)
     * Tek yönlü ilişki: AppUser tarafında yönetilir.
     */
    @OneToMany(mappedBy = "department", fetch = FetchType.LAZY)
    @Builder.Default
    private List<AppUser> members = new ArrayList<>();

    /**
     * Bu departmanın ilgilendiği kategoriler.
     */
    @OneToMany(mappedBy = "department", fetch = FetchType.LAZY)
    @Builder.Default
    private List<ReportCategory> categories = new ArrayList<>();
}
