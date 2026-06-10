package com.burak.belediyeapp.audit;

import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.dto.response.user.UserResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.AuditLog;
import com.burak.belediyeapp.repository.IAuditLogRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Denetim günlüğü Aspect'i.
 * @AuditAction ile işaretlenen tüm metodların çağrılarını
 * hem konsola hem de audit_logs tablosuna kaydeder.
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditAspect {

    private final IAuditLogRepository auditLogRepository;
    private final IReportRepository reportRepository;

    @AfterReturning(pointcut = "@annotation(auditAction)", returning = "result")
    public void logAudit(JoinPoint joinPoint, AuditAction auditAction, Object result) {
        String username = "Anonymous";
        String userId = null;
        AppUser actor = null;

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() != null) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof AppUser appUser) {
                actor = appUser;
                username = appUser.getEmail();
                userId = appUser.getId();
            } else if (principal instanceof String s) {
                username = s;
            }
        }

        String ipAddress = resolveIpAddress();
        String methodName = joinPoint.getSignature().toShortString();

        // Kısa bir sonuç özeti oluştur
        String resultSummary = null;
        if (result != null) {
            String str = result.toString();
            resultSummary = str.length() > 500 ? str.substring(0, 500) + "..." : str;
        }

        // Konsol logu
        log.info("[AUDIT] User: {} | Action: {} | Method: {} | Description: {}",
                username, auditAction.action(), methodName, auditAction.description());

        String entityId = resolveEntityId(joinPoint, result);
        String municipalityId = resolveMunicipalityId(actor, result, entityId);

        // DB'ye kaydet
        try {
            AuditLog entry = AuditLog.builder()
                    .username(username)
                    .userId(userId)
                    .action(auditAction.action())
                    .description(auditAction.description())
                    .methodName(methodName)
                    .resultSummary(resultSummary)
                    .ipAddress(ipAddress)
                    .municipalityId(municipalityId)
                    .entityId(entityId)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Audit log DB'ye kaydedilemedi: {}", e.getMessage());
        }
    }

    private String resolveEntityId(JoinPoint joinPoint, Object result) {
        if (result instanceof ReportResponse report) {
            return report.id();
        }
        if (result instanceof UserResponse user) {
            return user.id();
        }
        Object[] args = joinPoint.getArgs();
        if (args.length > 0 && args[0] instanceof String first && looksLikeUuid(first)) {
            return first;
        }
        return null;
    }

    private String resolveMunicipalityId(AppUser actor, Object result, String entityId) {
        if (actor != null && actor.getMunicipality() != null) {
            return actor.getMunicipality().getId();
        }
        if (result instanceof ReportResponse report) {
            return reportRepository.findById(report.id())
                    .map(r -> r.getMunicipality() != null ? r.getMunicipality().getId() : null)
                    .orElse(null);
        }
        if (entityId != null) {
            return reportRepository.findById(entityId)
                    .map(r -> r.getMunicipality() != null ? r.getMunicipality().getId() : null)
                    .orElse(null);
        }
        return null;
    }

    private boolean looksLikeUuid(String value) {
        return value != null && value.matches(
                "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    }

    private String resolveIpAddress() {
        try {
            var attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes sra) {
                HttpServletRequest request = sra.getRequest();
                String xff = request.getHeader("X-Forwarded-For");
                if (xff != null && !xff.isBlank()) {
                    return xff.split(",")[0].trim();
                }
                return request.getRemoteAddr();
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
