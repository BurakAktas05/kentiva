package com.burak.belediyeapp.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Yetki (Permission) entity — fine-grained erişim kontrolü için.
 * Örn: "REPORT_ASSIGN", "CATEGORY_DELETE", "USER_MANAGE"
 * Roller birden fazla yetkiye sahip olabilir.
 */
@Entity
@Table(name = "permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission extends BaseEntity {

    /**
     * Yetki adı. Genellikle "KAYNAK_EYLEM" formatında tutulur.
     * Örn: REPORT_READ, REPORT_ASSIGN, USER_MANAGE, DEPT_MANAGE
     */
    @Column(nullable = false, unique = true, length = 80)
    private String name;

    @Column(length = 200)
    private String description;
}
