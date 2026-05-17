package com.burak.belediyeapp.service.setup;

import com.burak.belediyeapp.dto.request.setup.BootstrapSuperAdminRequest;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlatformSetupServiceTest {

    @Mock
    private IAppUserRepository userRepository;
    @Mock
    private IRoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PlatformSetupService platformSetupService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(platformSetupService, "setupToken", "test-token");
    }

    @Test
    void bootstrapCreatesSuperAdminWhenNoneExists() {
        when(userRepository.countByRoles_Name("ROLE_SUPER_ADMIN")).thenReturn(0L);
        when(userRepository.existsByEmail("owner@kentiva.app")).thenReturn(false);
        when(roleRepository.findByName("ROLE_SUPER_ADMIN")).thenReturn(Optional.of(new Role()));
        when(passwordEncoder.encode("securepass1")).thenReturn("hash");

        platformSetupService.bootstrapSuperAdmin(
                new BootstrapSuperAdminRequest("owner@kentiva.app", "securepass1", "Burak", "Admin", null),
                "test-token");

        verify(userRepository).save(any());
    }

    @Test
    void bootstrapRejectsInvalidToken() {
        when(userRepository.countByRoles_Name("ROLE_SUPER_ADMIN")).thenReturn(0L);

        assertThatThrownBy(() -> platformSetupService.bootstrapSuperAdmin(
                new BootstrapSuperAdminRequest("a@b.com", "securepass1", "A", "B", null),
                "wrong"))
                .isInstanceOf(BusinessException.class);
    }
}
