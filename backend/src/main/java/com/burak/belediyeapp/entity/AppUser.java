package com.burak.belediyeapp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Sistemdeki tüm kullanıcıları temsil eder (vatandaş, saha ekibi, yönetici...).
 * Spring Security'nin UserDetails arayüzünü implemente eder — böylece
 * authentication için ayrı bir adapter sınıfına gerek kalmaz.
 */
@Entity
@Table(name = "app_users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AppUser extends BaseEntity implements UserDetails, TenantAware {

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    /**
     * Bcrypt hash — savunma derinliği için JSON serileştirmesinden dışlanır.
     * (UserDetails.getPassword() dahili Spring Security tarafından kullanılır.)
     */
    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 80)
    private String firstName;

    @Column(nullable = false, length = 80)
    private String lastName;

    /**
     * Telefon numarası: Belediye bildirimleri için kullanılabilir.
     */
    @Column(length = 20)
    private String phoneNumber;

    /**
     * Hesap aktif mi? Pasif hesaplar giriş yapamaz.
     */
    @Column(nullable = false)
    private boolean enabled = true;

    /**
     * Kullanıcının bağlı olduğu belediye birimi.
     * Vatandaşlar için null olabilir.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    /**
     * Kullanıcının bağlı olduğu ilçe.
     * Sadece bu ilçenin raporlarını görebilir.
     */
    @Column(length = 100)
    private String district;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "municipality_id")
    private Municipality municipality;

    /** Vatandaşın ana ekran widget'ları için seçtiği belediye (ihbar konumu ayrı). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "preferred_municipality_id")
    private Municipality preferredMunicipality;

    @Column(nullable = false)
    private int reputationScore = 100;

    /** FCM push token — bearer-equivalent secret, JSON yanıtlarda paylaşılmaz. */
    @JsonIgnore
    @Column(length = 255)
    private String fcmToken;

    /** KVKK açık rıza onayı */
    @Column(name = "kvkk_approved", nullable = false)
    private boolean kvkkApproved = false;

    @Column(name = "kvkk_approved_at")
    private java.time.LocalDateTime kvkkApprovedAt;

    @Column(name = "kvkk_signature", length = 512)
    private String kvkkSignature;

    @Column(name = "suspended_until")
    private java.time.LocalDateTime suspendedUntil;

    @Column(name = "suspension_reason", length = 500)
    private String suspensionReason;

    /**
     * Kullanıcı rolleri. EAGER yüklenir çünkü her request'te
     * yetki kontrolü için gereklidir.
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    // ===================================================
    // UserDetails Interface Implementasyonu
    // ===================================================

    /**
     * Rolleri ve alt yetkilerini Spring Security formatına dönüştürür.
     * Hem "ROLE_ADMIN" hem "REPORT_ASSIGN" gibi değerler otomatik eklenir.
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<GrantedAuthority> authorities = new HashSet<>();

        for (Role role : roles) {
            // Rolü ekle: "ROLE_ADMIN" formatında
            authorities.add(new SimpleGrantedAuthority(role.getName()));

            // Rolün tüm ince yetkilerini ekle
            role.getPermissions().stream()
                    .map(p -> new SimpleGrantedAuthority(p.getName()))
                    .forEach(authorities::add);
        }
        return authorities;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    // ===================================================
    // Yardımcı Metodlar
    // ===================================================

    public String getFullName() {
        return firstName + " " + lastName;
    }

    public boolean hasRole(String roleName) {
        String target = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
        return roles.stream().anyMatch(r -> r.getName().equals(target));
    }
}
