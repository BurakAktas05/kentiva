package com.burak.belediyeapp.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Denetim günlüğü (audit log) tutulacak metodları işaretlemek için kullanılır.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditAction {
    String action(); // Yapılan işlem (örn: "REPORT_STATUS_UPDATE")
    String description() default ""; // Detaylı açıklama
}
