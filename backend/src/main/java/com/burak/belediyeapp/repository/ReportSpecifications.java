package com.burak.belediyeapp.repository;

import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.entity.WorkflowMode;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Personel ihbar listesi için sunucu taraflı filtre (q / durum / tarih).
 */
public final class ReportSpecifications {

    private ReportSpecifications() {}

    public static Specification<Report> staffSearch(
            String municipalityId,
            String departmentId,
            boolean departmentalWorkflow,
            ReportStatus status,
            String q,
            LocalDateTime from,
            LocalDateTime to) {
        return (root, query, cb) -> {
            if (query != null && Report.class.equals(query.getResultType())) {
                root.fetch("category", JoinType.LEFT);
                query.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isFalse(root.get("hiddenFromMunicipality")));

            if (municipalityId != null && !municipalityId.isBlank()) {
                predicates.add(cb.equal(root.get("municipality").get("id"), municipalityId));
            }
            if (departmentId != null && !departmentId.isBlank()) {
                if (departmentalWorkflow) {
                    predicates.add(cb.equal(root.get("forwardedDepartment").get("id"), departmentId));
                } else {
                    predicates.add(cb.equal(root.get("category").get("department").get("id"), departmentId));
                }
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("reportStatus"), status));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("id")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("district"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("trackingNumber"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("category").get("name"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    public static boolean isDepartmental(WorkflowMode mode) {
        return mode == WorkflowMode.DEPARTMENTAL;
    }
}
