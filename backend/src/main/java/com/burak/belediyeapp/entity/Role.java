package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

/**
 * Sistem rolleri. Her rol birden fazla Permission içerebilir.
 * Sistemde tanımlı roller:
 *  - ROLE_CITIZEN          : Vatandaş — rapor oluşturur, kendi raporlarını görür
 *  - ROLE_FIELD_OFFICER    : Saha Ekibi — atanan raporu alır, durumu günceller
 *  - ROLE_DEPT_MANAGER     : Birim Müdürü — kendi departmanını yönetir, ekip atar
 *  - ROLE_ADMIN            : Belediye Yöneticisi — tüm raporlar, kullanıcılar, kategoriler
 *  - ROLE_SUPER_ADMIN      : Sistem Yöneticisi — departman, rol atama dahil tam yetki
 *  - ROLE_WHITE_DESK       : Beyaz Masa — ihbar alır; SIMPLE modda direkt atar, DEPARTMENTAL modda departmana yönlendirir
 */
@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Role extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 150)
    private String description;

    /**
     * Bu role bağlı ince taneli yetkiler.
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "role_permissions",
            joinColumns = @JoinColumn(name = "role_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();
}
