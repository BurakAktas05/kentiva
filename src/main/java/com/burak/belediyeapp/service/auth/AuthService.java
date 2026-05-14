package com.burak.belediyeapp.service.auth;

import com.burak.belediyeapp.dto.request.auth.LoginRequest;
import com.burak.belediyeapp.dto.request.auth.RefreshTokenRequest;
import com.burak.belediyeapp.dto.request.auth.RegisterRequest;
import com.burak.belediyeapp.dto.response.auth.AuthResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.RefreshToken;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IRefreshTokenRepository;
import com.burak.belediyeapp.repository.IRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Kayıt, giriş, token yenileme ve çıkış işlemlerini yönetir.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final IAppUserRepository userRepository;
    private final IRoleRepository roleRepository;
    private final IRefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    @Value("${app.security.jwt.refresh-token-expiration-days}")
    private long refreshTokenExpirationDays;

    // ===================================================
    // Kayıt — Vatandaşlar kendi hesabını oluşturur
    // ===================================================

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException(
                    "Bu email adresi zaten kullanımda: " + request.email(),
                    "EMAIL_ALREADY_EXISTS");
        }

        Role citizenRole = roleRepository.findByName("ROLE_CITIZEN")
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sistem rolü bulunamadı. Yöneticinizle iletişime geçin."));

        AppUser user = new AppUser();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setPhoneNumber(request.phoneNumber());
        user.setRoles(Set.of(citizenRole));

        AppUser savedUser = userRepository.save(user);
        log.info("Yeni vatandaş kaydı: {} ({})", savedUser.getFullName(), savedUser.getEmail());

        return buildAuthResponse(savedUser);
    }

    // ===================================================
    // Giriş
    // ===================================================

    @Transactional
    public AuthResponse login(LoginRequest request) {
        // Spring Security kendi BadCredentialsException'ını fırlatır — GlobalExceptionHandler yakalar
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        AppUser user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "email", request.email()));

        log.info("Kullanıcı girişi: {}", user.getEmail());
        return buildAuthResponse(user);
    }

    // ===================================================
    // Token Yenileme
    // ===================================================

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        RefreshToken storedToken = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> new BusinessException("Geçersiz refresh token", "INVALID_REFRESH_TOKEN"));

        if (!storedToken.isValid()) {
            throw new BusinessException("Refresh token süresi dolmuş veya iptal edilmiş", "REFRESH_TOKEN_EXPIRED");
        }

        // Rotation: mevcut token'ı iptal et
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        AppUser user = storedToken.getUser();
        if (!user.isEnabled()) {
            throw new BusinessException("Kullanıcı hesabı pasif durumda", "USER_DISABLED");
        }
        return buildAuthResponse(user);
    }

    // ===================================================
    // Çıkış
    // ===================================================

    @Transactional
    public void logout(String userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
        log.info("Kullanıcı çıkış yaptı: {}", userId);
    }

    // ===================================================
    // Yardımcı: AuthResponse + Refresh Token üretimi
    // ===================================================

    private AuthResponse buildAuthResponse(AppUser user) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshTokenValue = createRefreshToken(user);

        Set<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        com.burak.belediyeapp.dto.response.municipality.MunicipalityDto municipalityDto =
                com.burak.belediyeapp.dto.response.municipality.MunicipalityDto.fromEntity(user.getMunicipality());

        return AuthResponse.of(
                accessToken,
                refreshTokenValue,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                roles,
                user.getDistrict(),
                municipalityDto
        );
    }

    private String createRefreshToken(AppUser user) {
        RefreshToken token = RefreshToken.builder()
                .token(UUID.randomUUID().toString())
                .user(user)
                .expiresAt(LocalDateTime.now().plusDays(refreshTokenExpirationDays))
                .build();

        return refreshTokenRepository.save(token).getToken();
    }
}
