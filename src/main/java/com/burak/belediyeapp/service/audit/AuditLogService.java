package com.burak.belediyeapp.service.audit;

import com.burak.belediyeapp.dto.response.audit.AuditLogResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.AuditLog;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IAuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final IAuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(
            AppUser currentUser,
            String username,
            String action,
            String entityId,
            LocalDate fromDate,
            LocalDate toDate,
            String municipalityId,
            Pageable pageable) {

        String scopeMunicipalityId = resolveScopeMunicipalityId(currentUser, municipalityId);

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (scopeMunicipalityId != null) {
                predicates.add(cb.equal(root.get("municipalityId"), scopeMunicipalityId));
            }
            if (username != null && !username.isBlank()) {
                predicates.add(cb.equal(root.get("username"), username.trim()));
            }
            if (action != null && !action.isBlank()) {
                predicates.add(cb.equal(root.get("action"), action.trim()));
            }
            if (entityId != null && !entityId.isBlank()) {
                String id = entityId.trim();
                predicates.add(cb.or(
                        cb.equal(root.get("entityId"), id),
                        cb.like(cb.lower(root.get("description")), "%" + id.toLowerCase() + "%"),
                        cb.like(cb.lower(root.get("resultSummary")), "%" + id.toLowerCase() + "%")
                ));
            }
            if (fromDate != null) {
                LocalDateTime start = fromDate.atStartOfDay();
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
            }
            if (toDate != null) {
                LocalDateTime end = toDate.atTime(LocalTime.MAX);
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), end));
            }

            if (predicates.isEmpty()) {
                return cb.conjunction();
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return auditLogRepository.findAll(spec, pageable).map(this::toResponse);
    }

    private String resolveScopeMunicipalityId(AppUser currentUser, String requestedMunicipalityId) {
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            if (requestedMunicipalityId != null && !requestedMunicipalityId.isBlank()) {
                return requestedMunicipalityId.trim();
            }
            return null;
        }
        if (currentUser.getMunicipality() == null) {
            throw new BusinessException(
                    "Denetim günlüğü için belediye kapsamı tanımlı değil.",
                    "MUNICIPALITY_REQUIRED");
        }
        if (requestedMunicipalityId != null
                && !requestedMunicipalityId.isBlank()
                && !requestedMunicipalityId.equals(currentUser.getMunicipality().getId())) {
            throw new BusinessException(
                    "Başka belediyenin denetim kayıtlarına erişilemez.",
                    "CROSS_MUNICIPALITY_ACCESS");
        }
        return currentUser.getMunicipality().getId();
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getUsername(),
                log.getUserId(),
                log.getAction(),
                log.getDescription(),
                log.getMethodName(),
                log.getIpAddress(),
                log.getMunicipalityId(),
                log.getEntityId(),
                log.getResultSummary(),
                log.getCreatedAt()
        );
    }
}
