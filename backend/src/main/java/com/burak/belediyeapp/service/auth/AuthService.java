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
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import com.burak.belediyeapp.security.LoginAttemptService;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.security.TokenBlacklistService;
import com.burak.belediyeapp.service.sms.SmsOtpService;

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
    private final LoginAttemptService loginAttemptService;
    private final SmsOtpService smsOtpService;
    private final com.burak.belediyeapp.service.security.KvkkConsentSigningService kvkkConsentSigningService;
    private final JwtAuthenticationSupport jwtAuthenticationSupport;
    private final TokenBlacklistService tokenBlacklistService;
    private final com.burak.belediyeapp.service.media.MediaSignedUrlService mediaSignedUrlService;
    private final com.burak.belediyeapp.service.security.PasswordPolicyService passwordPolicyService;
    private final MernisVerificationService mernisVerificationService;

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
        String normalizedPhone = requireVerifiedRegistrationPhone(request.phoneNumber(), request.smsOtpCode());

        // Mernis doğrulaması (Opsiyonel / Özellik bayrağına göre aktifleşir)
        mernisVerificationService.verify(request.tcNo(), request.firstName(), request.lastName(), request.birthYear());

        Role citizenRole = roleRepository.findByName("ROLE_CITIZEN")
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sistem rolü bulunamadı. Yöneticinizle iletişime geçin."));
        AppUser user = new AppUser();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        passwordPolicyService.validateCitizenPassword(
                request.password(),
                request.email(),
                request.firstName(),
                request.lastName());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setPhoneNumber(normalizedPhone);
        user.getRoles().add(citizenRole);
        user.setKvkkApproved(Boolean.TRUE.equals(request.kvkkApproved()));
        if (user.isKvkkApproved()) {
            user.setKvkkApprovedAt(LocalDateTime.now());
        }

        final AppUser savedUser = userRepository.saveAndFlush(user);

        if (savedUser.isKvkkApproved()) {
            savedUser.setKvkkSignature(kvkkConsentSigningService.signUserConsent(
                    savedUser.getId(), savedUser.getEmail(), savedUser.getKvkkApprovedAt()));
            userRepository.saveAndFlush(savedUser);
        }

        jwtAuthenticationSupport.evictCache(savedUser.getEmail());
        log.info("Yeni vatandaş kaydı: {} ({})", savedUser.getFullName(), savedUser.getEmail());

        return buildAuthResponse(savedUser);
    }

    public String sendRegistrationOtp(String phoneNumber) {
        String normalizedPhone = requireRegistrationPhone(phoneNumber);
        if (findUserByPhone(normalizedPhone).isPresent()) {
            throw new BusinessException("Bu telefon numarası zaten kullanımda.", "PHONE_ALREADY_EXISTS");
        }
        boolean sent = smsOtpService.sendOtp(normalizedPhone);
        if (!sent) {
            throw new BusinessException(
                    "Doğrulama kodu gönderilemedi. Lütfen biraz sonra tekrar deneyin.",
                    "OTP_SEND_FAILED");
        }
        return smsOtpService.getDevBypassCode();
    }

    private String requireVerifiedRegistrationPhone(String phoneNumber, String smsOtpCode) {
        String normalizedPhone = requireRegistrationPhone(phoneNumber);
        if (findUserByPhone(normalizedPhone).isPresent()) {
            throw new BusinessException("Bu telefon numarası zaten kullanımda.", "PHONE_ALREADY_EXISTS");
        }
        if (!smsOtpService.verifyOtp(normalizedPhone, smsOtpCode)) {
            throw new BusinessException("SMS doğrulama kodu geçersiz veya süresi dolmuş.", "INVALID_OTP");
        }
        return normalizedPhone;
    }

    private String requireRegistrationPhone(String phoneNumber) {
        String normalizedPhone = smsOtpService.normalizePhoneNumber(phoneNumber);
        if (normalizedPhone == null || normalizedPhone.isBlank()) {
            throw new BusinessException("Telefon numarası zorunludur.", "PHONE_REQUIRED");
        }
        return normalizedPhone;
    }

    private Optional<AppUser> findUserByPhone(String phoneNumber) {
        for (String candidate : phoneCandidates(phoneNumber)) {
            Optional<AppUser> user = userRepository.findByPhoneNumber(candidate);
            if (user.isPresent()) {
                return user;
            }
        }
        return Optional.empty();
    }

    private Set<String> phoneCandidates(String phoneNumber) {
        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return candidates;
        }

        String normalized = smsOtpService.normalizePhoneNumber(phoneNumber);
        addPhoneCandidate(candidates, normalized);

        String digits = phoneNumber.replaceAll("[^0-9+]", "").replace("+", "");
        if (digits.startsWith("00")) {
            digits = digits.substring(2);
        }
        addPhoneCandidate(candidates, digits);

        if (normalized != null && normalized.startsWith("90") && normalized.length() == 12) {
            String local = normalized.substring(2);
            addPhoneCandidate(candidates, local);
            addPhoneCandidate(candidates, "0" + local);
        }
        if (digits.length() == 10) {
            addPhoneCandidate(candidates, "90" + digits);
            addPhoneCandidate(candidates, "0" + digits);
        }
        if (digits.startsWith("0") && digits.length() == 11) {
            String local = digits.substring(1);
            addPhoneCandidate(candidates, "90" + local);
            addPhoneCandidate(candidates, local);
        }

        return candidates;
    }

    private void addPhoneCandidate(Set<String> candidates, String value) {
        if (value != null && !value.isBlank()) {
            candidates.add(value.trim());
        }
    }

    // ===================================================
    // Giriş
    // ===================================================

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String key = request.email().toLowerCase();

        // Brute-force koruması
        if (loginAttemptService.isBlocked(key)) {
            long remaining = loginAttemptService.getRemainingLockSeconds(key);
            throw new BusinessException(
                    "Çok fazla başarısız deneme. " + (remaining / 60) + " dakika sonra tekrar deneyin.",
                    "ACCOUNT_LOCKED");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (Exception e) {
            loginAttemptService.loginFailed(key);
            throw e;
        }

        loginAttemptService.loginSucceeded(key);

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
    public void logout(String userId, String authHeader) {
        refreshTokenRepository.revokeAllByUserId(userId);
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7).trim();
                long remainingMs = jwtService.extractExpiration(token).getTime() - System.currentTimeMillis();
                if (remainingMs > 0) {
                    tokenBlacklistService.blacklistToken(token, remainingMs);
                }
            } catch (Exception e) {
                log.warn("Access token blacklist failed during logout: {}", e.getMessage());
            }
        }
        log.info("Kullanıcı çıkış yaptı: {}", userId);
    }

    // ===================================================
    // Şifre Sıfırlama — OTP ile
    // ===================================================

    /**
     * Telefon numarasına OTP gönder.
     * Hesap yok/var ayrımı yapılmaz (enumeration önleme).
     * SmsOtpService telefon-başına cooldown ve günlük tavan uygular → ek SMS flood'a karşı.
     */
    public void sendPasswordResetOtp(String phoneNumber) {
        String normalizedPhone = smsOtpService.normalizePhoneNumber(phoneNumber);
        findUserByPhone(normalizedPhone).ifPresent(user -> {
            boolean sent = smsOtpService.sendOtp(normalizedPhone);
            // Log'da kullanıcı kimliği/telefon değil, kullanıcı UUID'sinin kuyruk eki kullanılır.
            String tag = userTag(user.getId());
            if (!sent) {
                log.warn("Şifre sıfırlama SMS gönderilemedi (kullanıcı={})", tag);
            } else {
                log.info("Şifre sıfırlama OTP gönderildi (kullanıcı={})", tag);
            }
        });
    }

    private static String userTag(String userId) {
        if (userId == null || userId.length() < 8) return "***";
        return "u-" + userId.substring(userId.length() - 8);
    }

    /**
     * OTP doğrula ve yeni şifre ata.
     */
    @Transactional
    public void resetPasswordWithOtp(String phoneNumber, String otpCode, String newPassword) {
        String normalizedPhone = smsOtpService.normalizePhoneNumber(phoneNumber);
        if (!smsOtpService.verifyOtp(normalizedPhone, otpCode)) {
            throw new BusinessException("Doğrulama kodu geçersiz veya süresi dolmuş.",
                    "INVALID_OTP");
        }

        AppUser user = findUserByPhone(normalizedPhone)
                .orElseThrow(() -> new BusinessException(
                        "Bu telefon numarasına kayıtlı hesap bulunamadı.",
                        "PHONE_NOT_FOUND"));

        passwordPolicyService.validateCitizenPassword(
                newPassword,
                user.getEmail(),
                user.getFirstName(),
                user.getLastName());
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        jwtAuthenticationSupport.evictCache(user.getEmail());

        // Tüm mevcut oturumları kapat
        refreshTokenRepository.revokeAllByUserId(user.getId());

        log.info("Şifre sıfırlandı (kullanıcı={})", userTag(user.getId()));
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
                com.burak.belediyeapp.dto.response.municipality.MunicipalityDto.fromEntity(user.getMunicipality(), mediaSignedUrlService);

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
