package com.burak.belediyeapp.service.setup;

import com.burak.belediyeapp.dto.request.setup.BootstrapSuperAdminRequest;
import com.burak.belediyeapp.dto.response.setup.SetupStatusResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformSetupService {

    private static final String SUPER_ADMIN_ROLE = "ROLE_SUPER_ADMIN";

    private final IAppUserRepository userRepository;
    private final IRoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.setup.token:}")
    private String setupToken;

    @Transactional(readOnly = true)
    public SetupStatusResponse status() {
        boolean needs = needsBootstrap();
        // Platform kurulmuşsa setup token durumu sızdırılmaz — saldırgan platformun
        // henüz konfigüre edilip edilmediğini sayfa yanıtından öğrenemesin.
        return new SetupStatusResponse(needs, needs ? isBootstrapConfigured() : null);
    }

    @Transactional
    public void bootstrapSuperAdmin(BootstrapSuperAdminRequest request, String providedToken) {
        if (!needsBootstrap()) {
            throw new BusinessException("Platform zaten kurulmuş.", "SETUP_ALREADY_COMPLETED");
        }
        assertSetupToken(providedToken);

        if (userRepository.existsByEmail(request.email().trim().toLowerCase())) {
            throw new BusinessException("Bu e-posta zaten kayıtlı.", "EMAIL_ALREADY_EXISTS");
        }

        Role superRole = roleRepository.findByName(SUPER_ADMIN_ROLE)
                .orElseThrow(() -> new BusinessException(
                        "Sistem rolü eksik. Veritabanı migration'larını kontrol edin.",
                        "ROLE_NOT_FOUND"));

        AppUser user = new AppUser();
        user.setEmail(request.email().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        if (request.phoneNumber() != null && !request.phoneNumber().isBlank()) {
            user.setPhoneNumber(request.phoneNumber().trim());
        }
        user.getRoles().add(superRole);
        user.setEnabled(true);

        userRepository.save(user);
        log.info("Platform süper admin oluşturuldu: {}", user.getEmail());
    }

    private boolean needsBootstrap() {
        return userRepository.countByRoles_Name(SUPER_ADMIN_ROLE) == 0;
    }

    private boolean isBootstrapConfigured() {
        return setupToken != null && !setupToken.isBlank();
    }

    private void assertSetupToken(String providedToken) {
        if (!isBootstrapConfigured()) {
            throw new BusinessException(
                    "APP_SETUP_TOKEN tanımlı değil. Sunucu ortam değişkenlerine kurulum anahtarı ekleyin.",
                    "SETUP_TOKEN_NOT_CONFIGURED");
        }
        if (providedToken == null || providedToken.isBlank()
                || !setupToken.trim().equals(providedToken.trim())) {
            throw new BusinessException("Geçersiz kurulum anahtarı.", "SETUP_TOKEN_INVALID");
        }
    }
}
