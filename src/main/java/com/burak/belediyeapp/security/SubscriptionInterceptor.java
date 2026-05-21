package com.burak.belediyeapp.security;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.MembershipStatus;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.service.admin.MembershipStatusResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Aboneliği askıya alınmış veya süresi dolmuş belediyelere ait
 * personel ve API istemcilerinin erişimini engeller.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionInterceptor implements HandlerInterceptor {

    private final IMunicipalityRepository municipalityRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String uri = request.getRequestURI();

        // Bypass: auth, public, setup, media/access, actuator, swagger
        if (uri.startsWith("/api/v1/auth/")
                || uri.startsWith("/api/v1/public/")
                || uri.startsWith("/api/v1/setup/")
                || uri.startsWith("/api/v1/media/access")
                || uri.startsWith("/actuator/")
                || uri.startsWith("/swagger")
                || uri.startsWith("/v3/api-docs")) {
            return true;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return true; // Spring Security kendi engelleyecek
        }

        // Süper admin her zaman geçer
        if (auth.getAuthorities().stream().anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()))) {
            return true;
        }

        Municipality municipality = resolveMunicipality(auth);
        if (municipality == null) {
            return true; // Vatandaş — belediye bağımsız; ihbar oluşturma serviste kontrol edilir
        }

        MembershipStatus status = MembershipStatusResolver.resolve(municipality);
        if (status == MembershipStatus.SUSPENDED) {
            throw new BusinessException(
                    "Belediyenizin üyeliği askıya alınmıştır. Lütfen platform yöneticinizle iletişime geçin.",
                    "MUNICIPALITY_SUSPENDED");
        }
        if (status == MembershipStatus.EXPIRED) {
            throw new BusinessException(
                    "Belediyenizin abonelik süresi dolmuştur. Lütfen aboneliğinizi yenileyin.",
                    "MUNICIPALITY_EXPIRED");
        }
        return true;
    }

    private Municipality resolveMunicipality(Authentication auth) {
        Object principal = auth.getPrincipal();

        if (principal instanceof AppUser user) {
            return user.getMunicipality();
        }

        if (principal instanceof ApiKeyPrincipal apiKey) {
            String municipalityId = apiKey.getMunicipalityId();
            if (municipalityId != null && !municipalityId.isBlank()) {
                return municipalityRepository.findById(municipalityId).orElse(null);
            }
        }

        return null;
    }
}
