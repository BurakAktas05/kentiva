package com.burak.belediyeapp.tenant;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.TenantAware;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.security.ApiKeyPrincipal;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Optional;

/**
 * AOP aspect — repository katmanında otomatik kiracı (belediye) izolasyonu sağlar.
 * <ul>
 *   <li>Okuma: dönen entity'lerin belediye kapsamı doğrulanır.</li>
 *   <li>Yazma: entity'ye belediye otomatik atanır veya mevcut değer doğrulanır.</li>
 * </ul>
 *
 * Bypass durumları:
 * - SUPER_ADMIN rolü
 * - Anonim / kimliksiz erişim (scheduler, public endpoint)
 * - municipality == null olan entity'ler (platform geneli)
 */
@Aspect
@Component
@Slf4j
public class TenantIsolationAspect {

    // ── Okuma kontrolü ──────────────────────────────────

    @AfterReturning(
            pointcut = "execution(* com.burak.belediyeapp.repository..*.find*(..)) || " +
                       "execution(* com.burak.belediyeapp.repository..*.get*(..)) || " +
                       "execution(* com.burak.belediyeapp.repository..*.findAll*(..))",
            returning = "result"
    )
    public void verifyReadResult(JoinPoint jp, Object result) {
        String municipalityId = currentMunicipalityId();
        if (municipalityId == null) {
            return; // super admin, anonim veya vatandaş — bypass
        }

        if (result instanceof Optional<?> opt) {
            opt.ifPresent(entity -> checkEntity(entity, municipalityId));
        } else if (result instanceof Page<?> page) {
            page.getContent().forEach(entity -> checkEntity(entity, municipalityId));
        } else if (result instanceof Collection<?> coll) {
            coll.forEach(entity -> checkEntity(entity, municipalityId));
        } else if (result != null) {
            checkEntity(result, municipalityId);
        }
    }

    // ── Yazma kontrolü ──────────────────────────────────

    @Before("execution(* com.burak.belediyeapp.repository..*.save*(..)) || " +
            "execution(* com.burak.belediyeapp.repository..*.delete*(..))")
    public void verifySaveOrDelete(JoinPoint jp) {
        String municipalityId = currentMunicipalityId();
        if (municipalityId == null) {
            return;
        }

        for (Object arg : jp.getArgs()) {
            if (arg instanceof TenantAware entity) {
                enforceTenantOnWrite(entity, municipalityId);
            } else if (arg instanceof Iterable<?> iterable) {
                for (Object item : iterable) {
                    if (item instanceof TenantAware entity) {
                        enforceTenantOnWrite(entity, municipalityId);
                    }
                }
            }
        }
    }

    // ── Yardımcı metodlar ────────────────────────────────

    private void checkEntity(Object entity, String expectedId) {
        if (entity instanceof TenantAware ta) {
            Municipality m = ta.getMunicipality();
            if (m != null && !expectedId.equals(m.getId())) {
                log.warn("Kiracı izolasyon ihlali — beklenen={}, entity belediye={}, entity={}",
                        expectedId, m.getId(), entity.getClass().getSimpleName());
                throw new BusinessException(
                        "Bu kaynağa erişim yetkiniz yok",
                        "CROSS_MUNICIPALITY_ACCESS");
            }
        }
    }

    private void enforceTenantOnWrite(TenantAware entity, String expectedId) {
        Municipality m = entity.getMunicipality();
        if (m == null) {
            // null — platform geneli entity olabilir (ör. global kategori)
            return;
        }
        if (!expectedId.equals(m.getId())) {
            log.warn("Kiracı yazma ihlali — beklenen={}, entity belediye={}, entity={}",
                    expectedId, m.getId(), entity.getClass().getSimpleName());
            throw new BusinessException(
                    "Başka belediyeye ait kayıt oluşturulamaz/değiştirilemez",
                    "CROSS_MUNICIPALITY_ACCESS");
        }
    }

    /**
     * Geçerli kullanıcının belediye ID'sini döner.
     * null dönerse bypass edilir (super admin, anonim, vatandaş).
     */
    private String currentMunicipalityId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }

        Object principal = auth.getPrincipal();

        if (principal instanceof AppUser user) {
            // Süper admin bypass
            if (user.hasRole("ROLE_SUPER_ADMIN")) {
                return null;
            }
            // Vatandaş (municipality null) bypass — okuma servislerde kontrol edilir
            if (user.getMunicipality() == null) {
                return null;
            }
            return user.getMunicipality().getId();
        }

        if (principal instanceof ApiKeyPrincipal apiKey) {
            return apiKey.getMunicipalityId();
        }

        return null;
    }
}
