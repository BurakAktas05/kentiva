package com.burak.belediyeapp.service.user;

import com.burak.belediyeapp.audit.AuditAction;
import com.burak.belediyeapp.dto.request.user.ChangePasswordRequest;
import com.burak.belediyeapp.dto.request.user.CreateStaffRequest;
import com.burak.belediyeapp.dto.request.user.UpdateProfileRequest;
import com.burak.belediyeapp.dto.request.user.UpdateUserRolesRequest;
import com.burak.belediyeapp.dto.response.user.UserResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Department;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IDepartmentRepository;
import com.burak.belediyeapp.repository.IRefreshTokenRepository;
import com.burak.belediyeapp.repository.IRoleRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IMunicipalitySurveyVoteRepository;
import com.burak.belediyeapp.repository.INotificationRepository;
import com.burak.belediyeapp.repository.ISystemFeedbackRepository;
import com.burak.belediyeapp.repository.IUserNotificationPreferenceRepository;
import com.burak.belediyeapp.service.citizen.CitizenReputationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.security.TokenBlacklistService;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final IAppUserRepository userRepository;
    private final IRoleRepository roleRepository;
    private final IDepartmentRepository departmentRepository;
    private final IRefreshTokenRepository refreshTokenRepository;
    private final IUserNotificationPreferenceRepository userNotificationPreferenceRepository;
    private final INotificationRepository notificationRepository;
    private final ISystemFeedbackRepository systemFeedbackRepository;
    private final IMunicipalitySurveyVoteRepository municipalitySurveyVoteRepository;
    private final PasswordEncoder passwordEncoder;
    private final IMunicipalityRepository municipalityRepository;
    private final JwtAuthenticationSupport jwtAuthenticationSupport;
    private final TokenBlacklistService tokenBlacklistService;
    private final com.burak.belediyeapp.service.notification.NotificationService notificationService;
    private final com.burak.belediyeapp.service.media.MediaSignedUrlService mediaSignedUrlService;
    private final com.burak.belediyeapp.service.security.PasswordPolicyService passwordPolicyService;
    @Transactional(readOnly = true)
    public UserResponse getUserProfile(AppUser currentUser) {
        return mapToResponse(currentUser);
    }

    @Transactional
    public UserResponse updatePreferredMunicipality(AppUser currentUser, String municipalityId) {
        Municipality m = municipalityRepository.findById(municipalityId)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
        if (!m.isActive() || !m.isOnboarded()) {
            throw new BusinessException("Bu belediye henüz aktif değil.", "MUNICIPALITY_NOT_AVAILABLE");
        }
        currentUser.setPreferredMunicipality(m);
        AppUser saved = userRepository.save(currentUser);
        jwtAuthenticationSupport.evictCache(saved.getEmail());
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(AppUser currentUser, Pageable pageable) {
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            return userRepository.findAll(pageable)
                    .map(this::mapToResponse);
        } else if (currentUser.getMunicipality() != null) {
            return userRepository.findByMunicipalityId(currentUser.getMunicipality().getId(), pageable)
                    .map(this::mapToResponse);
        }
        return Page.empty();
    }
    
    @Transactional(readOnly = true)
    public Page<UserResponse> getUsersByRole(String roleName, AppUser currentUser, Pageable pageable) {
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            return userRepository.findByRoles_Name(roleName, pageable)
                    .map(this::mapToResponse);
        } else if (currentUser.getMunicipality() != null) {
            return userRepository.findByRoles_NameAndMunicipalityId(roleName, currentUser.getMunicipality().getId(), pageable)
                    .map(this::mapToResponse);
        }
        return Page.empty();
    }

    /**
     * Admin tarafından personel oluşturma.
     * Vatandaş kaydından farklı olarak belirli roller ve departman atanabilir.
     */
    @Transactional
    @AuditAction(action = "STAFF_CREATE", description = "Yeni personel oluşturuldu")
    public UserResponse createStaff(CreateStaffRequest request, AppUser currentUser) {
        String email = request.email();
        if (email == null || email.isBlank()) {
            email = "staff_" + java.util.UUID.randomUUID().toString().substring(0, 8) + "@kentiva.local";
        } else if (userRepository.existsByEmail(email)) {
            throw new BusinessException("Bu email adresi zaten kullanımda: " + email, "EMAIL_ALREADY_EXISTS");
        }

        String rawPassword = request.password();
        if (rawPassword == null || rawPassword.isBlank()) {
            rawPassword = passwordPolicyService.generateStrongPassword(16, true);
        }
        passwordPolicyService.validatePrivilegedPassword(
                rawPassword,
                email,
                request.firstName(),
                request.lastName());

        if (request.departmentId() == null || request.departmentId().isBlank()) {
            throw new BusinessException("Departman seçimi zorunludur", "DEPARTMENT_REQUIRED");
        }

        AppUser user = new AppUser();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setPhoneNumber(request.phoneNumber());

        // Rolleri ata
        if (request.roleNames() != null && !request.roleNames().isEmpty()) {
            ensureCanAssignRoles(request.roleNames(), currentUser);
            Set<Role> roles = new HashSet<>();
            for (String roleName : request.roleNames()) {
                Role role = roleRepository.findByName(roleName)
                        .orElseThrow(() -> new ResourceNotFoundException("Rol", "name", roleName));
                roles.add(role);
            }
            user.setRoles(roles);
        } else {
            // Varsayılan olarak CITIZEN rolü ata
            Role citizenRole = roleRepository.findByName("ROLE_CITIZEN")
                    .orElseThrow(() -> new ResourceNotFoundException("Sistem rolü bulunamadı"));
            user.getRoles().add(citizenRole);
        }
        // Departman ata
        if (request.departmentId() != null && !request.departmentId().isBlank()) {
            Department dept = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Departman", "id", request.departmentId()));
            ensureDepartmentInScope(dept, currentUser);
            user.setDepartment(dept);
            if (currentUser.hasRole("ROLE_SUPER_ADMIN") && dept.getMunicipality() != null) {
                user.setMunicipality(dept.getMunicipality());
                if (request.district() == null || request.district().isBlank()) {
                    user.setDistrict(dept.getMunicipality().getName());
                }
            }
        }

        // İlçe ata
        user.setDistrict(request.district());
        
        // Belediye ata
        if (currentUser.getMunicipality() != null && !currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            user.setMunicipality(currentUser.getMunicipality());
            if (request.district() == null || request.district().isBlank()) {
                user.setDistrict(currentUser.getMunicipality().getName());
            }
        }

        AppUser saved = userRepository.save(user);
        jwtAuthenticationSupport.evictCache(saved.getEmail());
        log.info("Yeni personel oluşturuldu: {} ({})", saved.getFullName(), saved.getEmail());
        return mapToResponse(saved);
    }

    /**
     * Kullanıcı rollerini güncelle.
     */
    @Transactional
    @AuditAction(action = "USER_ROLE_UPDATE", description = "Kullanıcı rolleri güncellendi")
    public UserResponse updateUserRoles(String userId, UpdateUserRolesRequest request, AppUser currentUser) {
        if (currentUser.getId().equals(userId)) {
            throw new BusinessException("Kendi rollerinizi güncelleyemezsiniz", "SELF_ROLE_UPDATE_NOT_ALLOWED");
        }

        AppUser user = findManageableUser(userId, currentUser);
        ensureCanAssignRoles(request.roleNames(), currentUser);

        Set<Role> roles = new HashSet<>();
        for (String roleName : request.roleNames()) {
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new ResourceNotFoundException("Rol", "name", roleName));
            roles.add(role);
        }
        user.setRoles(roles);

        AppUser saved = userRepository.save(user);
        jwtAuthenticationSupport.evictCache(saved.getEmail());
        log.info("Kullanıcı rolleri güncellendi: {} → {}", userId, request.roleNames());
        return mapToResponse(saved);
    }

    /**
     * Kullanıcı hesabını aktif/pasif yap.
     */
    @Transactional
    @AuditAction(action = "USER_TOGGLE_STATUS", description = "Kullanıcı durumu değiştirildi")
    public UserResponse toggleUserEnabled(String userId, AppUser currentUser) {
        if (currentUser.getId().equals(userId)) {
            throw new BusinessException("Kendi hesabınızı pasifleştiremezsiniz", "SELF_DISABLE_NOT_ALLOWED");
        }

        AppUser user = findManageableUser(userId, currentUser);
        if (user.hasRole("ROLE_SUPER_ADMIN") && !currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            throw new BusinessException("Super admin hesabı yalnızca super admin tarafından yönetilebilir", "ROLE_ESCALATION_NOT_ALLOWED");
        }

        user.setEnabled(!user.isEnabled());
        AppUser saved = userRepository.save(user);
        jwtAuthenticationSupport.evictCache(saved.getEmail());
        log.info("Kullanıcı durumu değiştirildi: {} → enabled={}", userId, saved.isEnabled());
        return mapToResponse(saved);
    }

    /**
     * Kullanıcıyı askıya al (sadece vatandaş).
     */
    @Transactional
    @AuditAction(action = "USER_SUSPEND", description = "Kullanıcı hesabı askıya alındı")
    public UserResponse suspendUser(String userId, com.burak.belediyeapp.dto.request.user.SuspendUserRequest request, AppUser currentUser) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", userId));
        
        // Sadece vatandaş rolü olan kullanıcılar askıya alınabilir
        if (!user.hasRole("ROLE_CITIZEN") || user.hasRole("ROLE_ADMIN") || user.hasRole("ROLE_SUPER_ADMIN")) {
            throw new BusinessException("Sadece vatandaş rollü kullanıcılar askıya alınabilir.", "SUSPEND_NOT_ALLOWED");
        }

        // Belediye adminleri sadece kendi belediyelerindeki vatandaşları askıya alabilsin
        if (!currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            if (currentUser.getMunicipality() == null) {
                throw new BusinessException("Bu işlem için belediye kapsamı gerekli", "MUNICIPALITY_REQUIRED");
            }
            boolean sameMuni = (user.getMunicipality() != null && user.getMunicipality().getId().equals(currentUser.getMunicipality().getId()))
                    || (user.getPreferredMunicipality() != null && user.getPreferredMunicipality().getId().equals(currentUser.getMunicipality().getId()));
            if (!sameMuni) {
                throw new BusinessException("Yalnızca kendi belediyenize bağlı vatandaşları askıya alabilirsiniz.", "CROSS_MUNICIPALITY_ACCESS");
            }
        }

        java.time.LocalDateTime suspendedUntil = java.time.LocalDateTime.now().plusDays(request.durationDays());
        user.setSuspendedUntil(suspendedUntil);
        user.setSuspensionReason(request.reason());

        AppUser saved = userRepository.save(user);
        jwtAuthenticationSupport.evictCache(saved.getEmail());

        // Refresh tokenları sil
        refreshTokenRepository.revokeAllByUserId(userId);

        // Bildirim gönder
        try {
            notificationService.notifyUserSuspended(saved, request.reason(), request.durationDays());
        } catch (Exception e) {
            log.warn("Askıya alma bildirimi gönderilemedi: {}", e.getMessage());
        }

        log.info("Kullanıcı askıya alındı: {} -> {} tarihine kadar. Gerekçe: {}", saved.getEmail(), suspendedUntil, request.reason());
        return mapToResponse(saved);
    }


    @Transactional
    public void updateFcmToken(String userId, String token) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", userId));
        user.setFcmToken(token);
        AppUser saved = userRepository.save(user);
        jwtAuthenticationSupport.evictCache(saved.getEmail());
    }

    @Transactional
    @AuditAction(action = "SELF_DATA_ERASURE", description = "Vatandas hesabi anonimlestirildi")
    public void eraseCitizenAccount(String userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanici", "id", userId));

        ensureSelfServiceCitizenAccount(user);
        if (isAlreadyErased(user)) {
            refreshTokenRepository.revokeAllByUserId(userId);
            tokenBlacklistService.blacklistCurrentToken();
            return;
        }

        String previousEmail = user.getEmail();

        userNotificationPreferenceRepository.deleteByUserId(userId);
        notificationRepository.deleteAllByUserId(userId);
        systemFeedbackRepository.deleteAllByUserId(userId);
        municipalitySurveyVoteRepository.deleteAllByUserId(userId);
        refreshTokenRepository.revokeAllByUserId(userId);

        anonymizeUser(user);
        AppUser saved = userRepository.save(user);
        jwtAuthenticationSupport.evictCache(previousEmail);
        jwtAuthenticationSupport.evictCache(saved.getEmail());
        tokenBlacklistService.blacklistCurrentToken();
        log.info("Vatandas hesabi anonimlestirildi: {}", previousEmail);
    }

    // =====================================================
    //  Profil Güncelleme & Şifre Değiştirme
    // =====================================================

    /**
     * Kullanıcının kendi profilini güncellemesi.
     * Sadece gönderilen (null olmayan) alanlar güncellenir — partial update.
     */
    @Transactional
    @AuditAction(action = "PROFILE_UPDATE", description = "Kullanıcı kendi profilini güncelledi")
    public UserResponse updateProfile(String userId, UpdateProfileRequest request) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", userId));

        if (request.firstName() != null && !request.firstName().isBlank()) {
            user.setFirstName(request.firstName().trim());
        }
        if (request.lastName() != null && !request.lastName().isBlank()) {
            user.setLastName(request.lastName().trim());
        }
        if (request.phoneNumber() != null) {
            user.setPhoneNumber(request.phoneNumber().trim());
        }

        AppUser saved = userRepository.save(user);
        jwtAuthenticationSupport.evictCache(saved.getEmail());
        log.info("Profil güncellendi: {}", saved.getEmail());
        return mapToResponse(saved);
    }

    /**
     * Kullanıcının kendi şifresini değiştirmesi.
     * Mevcut şifre doğrulanır, ardından yeni şifre set edilir.
     * Güvenlik için tüm refresh tokenlar iptal edilir.
     */
    @Transactional
    @AuditAction(action = "PASSWORD_CHANGE", description = "Kullanıcı şifresini değiştirdi")
    public void changePassword(String userId, ChangePasswordRequest request) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", userId));

        // Mevcut şifreyi doğrula
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BusinessException("Mevcut şifre hatalı", "INVALID_CURRENT_PASSWORD");
        }

        // Yeni şifre eski şifreyle aynı olmamalı
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new BusinessException("Yeni şifre eski şifre ile aynı olamaz", "SAME_PASSWORD");
        }

        passwordPolicyService.validateCitizenPassword(
                request.newPassword(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName());
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        jwtAuthenticationSupport.evictCache(user.getEmail());
        tokenBlacklistService.blacklistCurrentToken();

        // Güvenlik: tüm refresh tokenları iptal et — kullanıcı yeniden giriş yapmalı
        refreshTokenRepository.revokeAllByUserId(userId);
        log.info("Şifre değiştirildi ve tüm refresh tokenlar iptal edildi: {}", user.getEmail());
    }

    private AppUser findManageableUser(String userId, AppUser currentUser) {
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            return userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", userId));
        }
        if (currentUser.getMunicipality() == null) {
            throw new BusinessException("Bu işlem için belediye kapsamı gerekli", "MUNICIPALITY_REQUIRED");
        }
        return userRepository.findByIdAndMunicipalityId(userId, currentUser.getMunicipality().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", userId));
    }

    private void ensureDepartmentInScope(Department department, AppUser currentUser) {
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            return;
        }
        if (currentUser.getMunicipality() == null
                || department.getMunicipality() == null
                || !department.getMunicipality().getId().equals(currentUser.getMunicipality().getId())) {
            throw new BusinessException("Başka belediyeye ait departman seçilemez", "CROSS_MUNICIPALITY_ACCESS");
        }
    }

    private void ensureCanAssignRoles(Set<String> roleNames, AppUser currentUser) {
        if (!currentUser.hasRole("ROLE_SUPER_ADMIN") && roleNames.contains("ROLE_SUPER_ADMIN")) {
            throw new BusinessException("Super admin rolü atanamaz", "ROLE_ESCALATION_NOT_ALLOWED");
        }
    }

    private void anonymizeUser(AppUser user) {
        user.setEmail("deleted+" + user.getId() + "@deleted.kentiva.local");
        user.setFirstName("Deleted");
        user.setLastName("Citizen");
        user.setPhoneNumber(null);
        user.setPassword(passwordEncoder.encode(UUID.randomUUID() + "-deleted-user"));
        user.setEnabled(false);
        user.setDepartment(null);
        user.setDistrict(null);
        user.setMunicipality(null);
        user.setPreferredMunicipality(null);
        user.setFcmToken(null);
        user.setKvkkApproved(false);
        user.setKvkkApprovedAt(null);
        user.setKvkkSignature(null);
        user.setSuspendedUntil(null);
        user.setSuspensionReason("SELF_DATA_ERASURE");
        user.setReputationScore(0);
        user.setLoyaltyPoints(0);
    }

    private void ensureSelfServiceCitizenAccount(AppUser user) {
        boolean citizenOnly = user.hasRole("ROLE_CITIZEN")
                && user.getRoles().stream().map(Role::getName).allMatch("ROLE_CITIZEN"::equals);
        if (!citizenOnly) {
            throw new BusinessException(
                    "Personel hesaplari icin self-servis veri silme kullanilamaz. Lutfen platform yoneticinize basvurun.",
                    "SELF_ERASURE_NOT_ALLOWED");
        }
    }

    private boolean isAlreadyErased(AppUser user) {
        return !user.isEnabled()
                && user.getEmail() != null
                && user.getEmail().endsWith("@deleted.kentiva.local");
    }

    private UserResponse mapToResponse(AppUser user) {
        com.burak.belediyeapp.dto.response.municipality.MunicipalityDto municipalityDto =
                com.burak.belediyeapp.dto.response.municipality.MunicipalityDto.fromEntity(user.getMunicipality(), mediaSignedUrlService);
        com.burak.belediyeapp.dto.response.municipality.MunicipalityDto preferredDto =
                com.burak.belediyeapp.dto.response.municipality.MunicipalityDto.fromEntity(user.getPreferredMunicipality(), mediaSignedUrlService);
        int score = user.getReputationScore();

        String departmentId = user.getDepartment() != null ? user.getDepartment().getId() : null;
        String departmentName = user.getDepartment() != null ? user.getDepartment().getName() : null;

        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRoles().stream().map(Role::getName).collect(Collectors.toList()),
                user.getDistrict(),
                municipalityDto,
                preferredDto,
                score,
                user.getLoyaltyPoints(),
                CitizenReputationService.levelForScore(score),
                user.getSuspendedUntil(),
                user.getSuspensionReason(),
                departmentId,
                departmentName
        );
    }
}
