package com.burak.belediyeapp.service.user;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IDepartmentRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IMunicipalitySurveyVoteRepository;
import com.burak.belediyeapp.repository.INotificationRepository;
import com.burak.belediyeapp.repository.IRefreshTokenRepository;
import com.burak.belediyeapp.repository.IRoleRepository;
import com.burak.belediyeapp.repository.ISystemFeedbackRepository;
import com.burak.belediyeapp.repository.IUserNotificationPreferenceRepository;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.security.TokenBlacklistService;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import com.burak.belediyeapp.service.notification.NotificationService;
import com.burak.belediyeapp.service.security.PasswordPolicyService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock IAppUserRepository userRepository;
    @Mock IRoleRepository roleRepository;
    @Mock IDepartmentRepository departmentRepository;
    @Mock IRefreshTokenRepository refreshTokenRepository;
    @Mock IUserNotificationPreferenceRepository userNotificationPreferenceRepository;
    @Mock INotificationRepository notificationRepository;
    @Mock ISystemFeedbackRepository systemFeedbackRepository;
    @Mock IMunicipalitySurveyVoteRepository municipalitySurveyVoteRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock IMunicipalityRepository municipalityRepository;
    @Mock JwtAuthenticationSupport jwtAuthenticationSupport;
    @Mock TokenBlacklistService tokenBlacklistService;
    @Mock NotificationService notificationService;
    @Mock MediaSignedUrlService mediaSignedUrlService;
    @Mock PasswordPolicyService passwordPolicyService;

    @InjectMocks UserService userService;

    @Test
    void eraseCitizenAccountAnonymizesUserAndDeletesOwnedContent() {
        AppUser user = new AppUser();
        user.setId("user-123");
        user.setEmail("vatandas@kentiva.app");
        user.setFirstName("Ali");
        user.setLastName("Yilmaz");
        user.setEnabled(true);
        user.setRoles(Set.of(new Role("ROLE_CITIZEN", "Citizen", Set.of())));

        when(userRepository.findById("user-123")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(any())).thenReturn("hashed-deleted-password");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.eraseCitizenAccount("user-123");

        verify(userNotificationPreferenceRepository).deleteByUserId("user-123");
        verify(notificationRepository).deleteAllByUserId("user-123");
        verify(systemFeedbackRepository).deleteAllByUserId("user-123");
        verify(municipalitySurveyVoteRepository).deleteAllByUserId("user-123");
        verify(refreshTokenRepository).revokeAllByUserId("user-123");
        verify(tokenBlacklistService).blacklistCurrentToken();
        verify(jwtAuthenticationSupport).evictCache("vatandas@kentiva.app");

        ArgumentCaptor<AppUser> savedCaptor = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(savedCaptor.capture());
        AppUser saved = savedCaptor.getValue();
        assertThat(saved.getEmail()).isEqualTo("deleted+user-123@deleted.kentiva.local");
        assertThat(saved.getFirstName()).isEqualTo("Deleted");
        assertThat(saved.getLastName()).isEqualTo("Citizen");
        assertThat(saved.isEnabled()).isFalse();
        assertThat(saved.getPhoneNumber()).isNull();
        assertThat(saved.getFcmToken()).isNull();
        assertThat(saved.getKvkkApprovedAt()).isNull();
        assertThat(saved.getKvkkSignature()).isNull();
    }

    @Test
    void eraseCitizenAccountDoesNotRewriteAlreadyErasedUser() {
        AppUser user = new AppUser();
        user.setId("user-123");
        user.setEmail("deleted+user-123@deleted.kentiva.local");
        user.setEnabled(false);
        user.setRoles(Set.of(new Role("ROLE_CITIZEN", "Citizen", Set.of())));

        when(userRepository.findById("user-123")).thenReturn(Optional.of(user));

        userService.eraseCitizenAccount("user-123");

        verify(refreshTokenRepository).revokeAllByUserId("user-123");
        verify(tokenBlacklistService).blacklistCurrentToken();
        verify(userRepository, never()).save(any(AppUser.class));
    }
}
