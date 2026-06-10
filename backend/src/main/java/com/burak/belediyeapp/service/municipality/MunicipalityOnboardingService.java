package com.burak.belediyeapp.service.municipality;

import com.burak.belediyeapp.dto.request.municipality.CreateMunicipalityRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityOnboardingRequest;
import com.burak.belediyeapp.dto.response.category.CategoryResponse;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityOnboardingResponse;
import com.burak.belediyeapp.dto.response.user.UserResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.MunicipalityType;
import com.burak.belediyeapp.entity.ReportCategory;
import com.burak.belediyeapp.entity.Role;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.repository.IRoleRepository;
import com.burak.belediyeapp.config.CacheNames;
import com.burak.belediyeapp.config.EvictMunicipalityCaches;
import com.burak.belediyeapp.service.department.DepartmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class MunicipalityOnboardingService {

    private final MunicipalityManagementService municipalityManagementService;
    private final IMunicipalityRepository municipalityRepository;
    private final IAppUserRepository userRepository;
    private final IRoleRepository roleRepository;
    private final IReportCategoryRepository categoryRepository;
    private final com.burak.belediyeapp.repository.IDepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final DepartmentService departmentService;

    @Transactional
    @CacheEvict(value = CacheNames.CATEGORIES, allEntries = true)
    @EvictMunicipalityCaches
    public MunicipalityOnboardingResponse onboard(MunicipalityOnboardingRequest request) {
        String adminEmail = request.admin().email().trim().toLowerCase();
        if (userRepository.existsByEmail(adminEmail)) {
            throw new BusinessException(
                    "Bu e-posta zaten kayıtlı: " + adminEmail,
                    "EMAIL_ALREADY_EXISTS");
        }

        MunicipalityOnboardingRequest.MunicipalityPart m = request.municipality();
        MunicipalityDto municipalityDto = municipalityManagementService.create(
                new CreateMunicipalityRequest(
                        m.name(),
                        MunicipalityType.DISTRICT,
                        m.parentMunicipalityId(),
                        m.slug(),
                        m.displayName(),
                        m.centerLat(),
                        m.centerLng(),
                        m.defaultZoom(),
                        m.slogan()));

        Municipality municipality = municipalityRepository.findById(municipalityDto.id())
                .orElseThrow(() -> new IllegalStateException("Belediye kaydı oluşturulamadı"));

        municipality.setWorkflowMode(
                "DEPARTMENTAL".equals(m.workflowMode())
                        ? com.burak.belediyeapp.entity.WorkflowMode.DEPARTMENTAL
                        : com.burak.belediyeapp.entity.WorkflowMode.SIMPLE);
        municipalityRepository.save(municipality);

        UserResponse admin = createFirstAdmin(request.admin(), municipality, adminEmail);

        if (request.whiteDesk() != null) {
            String wdEmail = request.whiteDesk().email().trim().toLowerCase();
            if (!userRepository.existsByEmail(wdEmail)) {
                createWhiteDeskUser(request.whiteDesk(), municipality, wdEmail);
            }
        }

        if (request.departments() != null && !request.departments().isEmpty()) {
            seedDepartments(municipality, request.departments());
        }

        CategorySeedResult categories = seedCategories(municipality, request.categories());

        log.info(
                "Belediye onboarding tamamlandı: {} — admin: {}, kategori: {}/{}",
                municipality.getSlug(),
                admin.email(),
                categories.created().size(),
                categories.skipped().size());

        return new MunicipalityOnboardingResponse(
                municipalityDto, admin, categories.created(), categories.skipped());
    }

    private UserResponse createFirstAdmin(
            MunicipalityOnboardingRequest.AdminPart adminPart, Municipality municipality, String normalizedEmail) {
        NameParts names = splitFullName(adminPart.fullName());

        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new BusinessException("ROLE_ADMIN bulunamadı", "ROLE_NOT_FOUND"));

        AppUser user = new AppUser();
        user.setFirstName(names.firstName());
        user.setLastName(names.lastName());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(adminPart.password()));
        user.setPhoneNumber(adminPart.phone() != null && !adminPart.phone().isBlank() ? adminPart.phone().trim() : null);
        user.setRoles(Set.of(adminRole));
        user.setMunicipality(municipality);
        user.setDistrict(municipality.getName());
        user.setEnabled(true);

        AppUser saved = userRepository.save(user);
        return toUserResponse(saved);
    }

    private void createWhiteDeskUser(
            MunicipalityOnboardingRequest.WhiteDeskPart part, Municipality municipality, String normalizedEmail) {
        NameParts names = splitFullName(part.fullName());

        Role wdRole = roleRepository.findByName("ROLE_WHITE_DESK")
                .orElseThrow(() -> new BusinessException("ROLE_WHITE_DESK bulunamadı", "ROLE_NOT_FOUND"));

        AppUser user = new AppUser();
        user.setFirstName(names.firstName());
        user.setLastName(names.lastName());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(part.password()));
        user.setPhoneNumber(part.phone() != null && !part.phone().isBlank() ? part.phone().trim() : null);
        user.setRoles(Set.of(wdRole));
        user.setMunicipality(municipality);
        user.setDistrict(municipality.getName());
        user.setEnabled(true);

        userRepository.save(user);
    }

    private void seedDepartments(
            Municipality municipality, List<MunicipalityOnboardingRequest.DepartmentPart> departments) {
        for (MunicipalityOnboardingRequest.DepartmentPart part : departments) {
            String name = part.name().trim();
            if (name.isBlank()) continue;
            
            com.burak.belediyeapp.entity.Department dept = new com.burak.belediyeapp.entity.Department();
            dept.setName(name);
            dept.setSlug(departmentService.resolveUniqueSlugForSeed(
                    part.slug(),
                    name,
                    municipality.getId()));
            dept.setDescription(part.description());
            dept.setMunicipality(municipality);
            dept.setActive(true);
            departmentRepository.save(dept);
        }
    }

    private CategorySeedResult seedCategories(
            Municipality municipality, List<MunicipalityOnboardingRequest.CategoryPart> categories) {
        List<CategoryResponse> created = new ArrayList<>();
        List<String> skipped = new ArrayList<>();

        for (MunicipalityOnboardingRequest.CategoryPart part : categories) {
            String name = part.name().trim();
            if (name.isBlank()) {
                continue;
            }
            if (categoryRepository.existsByMunicipalityIdAndName(municipality.getId(), name)) {
                skipped.add(name);
                continue;
            }
            ReportCategory category = ReportCategory.builder()
                    .name(name)
                    .description(part.description())
                    .iconCode(part.iconCode())
                    .active(true)
                    .municipality(municipality)
                    .build();
            ReportCategory saved = categoryRepository.save(category);
            created.add(new CategoryResponse(
                    saved.getId(), saved.getName(), saved.getDescription(), saved.getIconCode()));
        }
        return new CategorySeedResult(created, skipped);
    }

    private record CategorySeedResult(List<CategoryResponse> created, List<String> skipped) {}

    record NameParts(String firstName, String lastName) {}

    public static NameParts splitFullName(String fullName) {
        String trimmed = fullName.trim();
        int space = trimmed.indexOf(' ');
        if (space <= 0) {
            return new NameParts(trimmed, trimmed);
        }
        String first = trimmed.substring(0, space).trim();
        String last = trimmed.substring(space + 1).trim();
        if (last.isBlank()) {
            last = first;
        }
        return new NameParts(first, last);
    }

    private UserResponse toUserResponse(AppUser user) {
        MunicipalityDto municipalityDto = MunicipalityDto.fromEntity(user.getMunicipality());
        int score = user.getReputationScore();
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRoles().stream().map(Role::getName).toList(),
                user.getDistrict(),
                municipalityDto,
                com.burak.belediyeapp.dto.response.municipality.MunicipalityDto.fromEntity(user.getPreferredMunicipality()),
                score,
                com.burak.belediyeapp.service.citizen.CitizenReputationService.levelForScore(score));
    }
}
