package com.burak.belediyeapp.service.municipality;

import com.burak.belediyeapp.dto.request.municipality.CreateMunicipalityRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityOnboardingRequest;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityType;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IRoleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MunicipalityOnboardingServiceTest {

    @Mock MunicipalityManagementService municipalityManagementService;
    @Mock IMunicipalityRepository municipalityRepository;
    @Mock IAppUserRepository userRepository;
    @Mock IRoleRepository roleRepository;
    @Mock IReportCategoryRepository categoryRepository;
    @Mock PasswordEncoder passwordEncoder;

    @InjectMocks MunicipalityOnboardingService municipalityOnboardingService;

    @Test
    void splitFullName_splitsOnFirstSpace() {
        var parts = MunicipalityOnboardingService.splitFullName("Ayşe Yılmaz");
        assertThat(parts.firstName()).isEqualTo("Ayşe");
        assertThat(parts.lastName()).isEqualTo("Yılmaz");
    }

    @Test
    void splitFullName_usesSameForSingleToken() {
        var parts = MunicipalityOnboardingService.splitFullName("Admin");
        assertThat(parts.firstName()).isEqualTo("Admin");
        assertThat(parts.lastName()).isEqualTo("Admin");
    }

    @Test
    void onboard_rejectsDuplicateEmail() {
        when(userRepository.existsByEmail("admin@test.com")).thenReturn(true);

        assertThatThrownBy(() -> municipalityOnboardingService.onboard(sampleRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("zaten kayıtlı");

        verify(municipalityManagementService, never()).create(any());
    }

    @Test
    void onboard_createsMunicipalityAdminAndSkipsExistingCategories() {
        when(userRepository.existsByEmail("admin@test.com")).thenReturn(false);
        when(municipalityManagementService.create(any(CreateMunicipalityRequest.class)))
                .thenReturn(new MunicipalityDto(
                        "m-1", "Test İlçe", "DISTRICT", null, 41.0, 29.0, 12,
                        "test-ilce", "Test İlçe", null, null, null, null,
                        "Slogan", null, null, null, false, true, true,
                        "TRIAL", null, null, "TRIAL",
                        null, null, null, null,
                        null, null, null, null, null, null));
        Municipality municipality = Municipality.builder()
                .name("Test İlçe")
                .type(MunicipalityType.DISTRICT)
                .slug("test-ilce")
                .build();
        municipality.setId("m-1");
        when(municipalityRepository.findById("m-1")).thenReturn(Optional.of(municipality));
        Role adminRole = new Role();
        adminRole.setName("ROLE_ADMIN");
        adminRole.setDescription("Admin");
        when(roleRepository.findByName("ROLE_ADMIN")).thenReturn(Optional.of(adminRole));
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(categoryRepository.existsByMunicipalityIdAndName("m-1", "Çukur")).thenReturn(true);
        when(categoryRepository.existsByMunicipalityIdAndName("m-1", "Park")).thenReturn(false);
        when(categoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> {
            com.burak.belediyeapp.entity.AppUser u = inv.getArgument(0);
            u.setId("user-admin-1");
            return u;
        });

        var result = municipalityOnboardingService.onboard(sampleRequest());

        assertThat(result.municipality().id()).isEqualTo("m-1");
        assertThat(result.admin().email()).isEqualTo("admin@test.com");
        assertThat(result.categoriesSkipped()).containsExactly("Çukur");
        assertThat(result.categoriesCreated()).hasSize(1);

        ArgumentCaptor<com.burak.belediyeapp.entity.AppUser> userCaptor =
                ArgumentCaptor.forClass(com.burak.belediyeapp.entity.AppUser.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getMunicipality().getId()).isEqualTo("m-1");
        assertThat(userCaptor.getValue().getRoles()).extracting(Role::getName).containsExactly("ROLE_ADMIN");
    }

    private static MunicipalityOnboardingRequest sampleRequest() {
        return new MunicipalityOnboardingRequest(
                new MunicipalityOnboardingRequest.MunicipalityPart(
                        "Test İlçe", "test-ilce", "Test İlçe", 41.0, 29.0, 12, "Slogan", null),
                new MunicipalityOnboardingRequest.AdminPart(
                        "admin@test.com", "password12", "Ali Veli", "5551112233"),
                List.of(
                        new MunicipalityOnboardingRequest.CategoryPart("Çukur", "Yol çukuru", "road_crack"),
                        new MunicipalityOnboardingRequest.CategoryPart("Park", "Park alanı", "park")));
    }
}
