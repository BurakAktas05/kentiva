package com.burak.belediyeapp.service.department;

import com.burak.belediyeapp.audit.AuditAction;
import com.burak.belediyeapp.dto.request.department.CreateDepartmentRequest;
import com.burak.belediyeapp.dto.request.department.UpdateDepartmentRequest;
import com.burak.belediyeapp.dto.response.department.DepartmentResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Department;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IDepartmentRepository;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DepartmentService {

    private final IDepartmentRepository departmentRepository;
    private final IMunicipalityRepository municipalityRepository;

    @Transactional(readOnly = true)
    public List<DepartmentResponse> getAllDepartments(AppUser currentUser) {
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            return departmentRepository.findAll().stream()
                    .map(this::mapToResponse)
                    .toList();
        }
        if (currentUser.getMunicipality() != null) {
            return departmentRepository.findByMunicipalityId(currentUser.getMunicipality().getId()).stream()
                    .map(this::mapToResponse)
                    .toList();
        }
        return List.of();
    }

    @Transactional(readOnly = true)
    public DepartmentResponse getPublicDepartmentContext(String municipalitySlug, String departmentSlug) {
        Municipality municipality = municipalityRepository.findBySlugIgnoreCaseAndActiveTrue(municipalitySlug)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "slug", municipalitySlug));
        Department department = departmentRepository
                .findByMunicipalityIdAndSlugIgnoreCase(municipality.getId(), departmentSlug)
                .filter(Department::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Departman", "slug", departmentSlug));
        return mapToResponse(department);
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> getActiveDepartmentsForMunicipalitySlug(String municipalitySlug) {
        Municipality municipality = municipalityRepository.findBySlugIgnoreCaseAndActiveTrue(municipalitySlug)
                .orElseThrow(() -> new ResourceNotFoundException("Belediye", "slug", municipalitySlug));
        return departmentRepository.findAllByActiveTrueAndMunicipalityIdOrderByNameAsc(municipality.getId()).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    @AuditAction(action = "DEPARTMENT_CREATE", description = "Yeni departman olusturuldu")
    public DepartmentResponse createDepartment(CreateDepartmentRequest request, AppUser currentUser) {
        Municipality targetMunicipality = resolveTargetMunicipality(request.municipalityId(), currentUser);
        String municipalityId = targetMunicipality.getId();

        String normalizedName = request.name().trim();
        if (existsByNameInScope(normalizedName, municipalityId)) {
            throw new BusinessException(
                    "Bu departman adi bu belediyede zaten kullanimda: " + normalizedName,
                    "DEPARTMENT_NAME_EXISTS");
        }

        Department department = Department.builder()
                .name(normalizedName)
                .slug(resolveUniqueSlug(request.slug(), normalizedName, municipalityId, null))
                .description(blankToNull(request.description()))
                .active(true)
                .municipality(targetMunicipality)
                .build();

        Department saved = departmentRepository.save(department);
        log.info("Departman olusturuldu: {} (belediye={}, slug={})", saved.getName(), municipalityId, saved.getSlug());
        return mapToResponse(saved);
    }

    @Transactional
    @AuditAction(action = "DEPARTMENT_UPDATE", description = "Departman guncellendi")
    public DepartmentResponse updateDepartment(String departmentId, UpdateDepartmentRequest request, AppUser currentUser) {
        Department department = findDepartmentForUser(departmentId, currentUser);
        Municipality municipality = department.getMunicipality();
        String municipalityId = municipality != null ? municipality.getId() : null;

        String normalizedName = request.name().trim();
        if (!department.getName().equalsIgnoreCase(normalizedName) && existsByNameInScope(normalizedName, municipalityId)) {
            throw new BusinessException(
                    "Bu departman adi bu belediyede zaten kullanimda: " + normalizedName,
                    "DEPARTMENT_NAME_EXISTS");
        }

        department.setName(normalizedName);
        department.setSlug(resolveUniqueSlug(request.slug(), normalizedName, municipalityId, department.getId()));
        department.setDescription(blankToNull(request.description()));
        if (request.isActive() != null) {
            department.setActive(request.isActive());
        }

        Department saved = departmentRepository.save(department);
        log.info("Departman guncellendi: {} (slug={})", saved.getName(), saved.getSlug());
        return mapToResponse(saved);
    }

    @Transactional
    @AuditAction(action = "DEPARTMENT_DELETE", description = "Departman devre disi birakildi")
    public void deleteDepartment(String departmentId, AppUser currentUser) {
        Department department = findDepartmentForUser(departmentId, currentUser);
        department.setActive(false);
        departmentRepository.save(department);
        log.info("Departman devre disi birakildi: {}", department.getName());
    }

    public String resolveUniqueSlugForSeed(String requestedSlug, String name, String municipalityId) {
        return resolveUniqueSlug(requestedSlug, name, municipalityId, null);
    }

    private Municipality resolveTargetMunicipality(String requestedMunicipalityId, AppUser currentUser) {
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            String municipalityId = blankToNull(requestedMunicipalityId);
            if (municipalityId != null) {
                return municipalityRepository.findById(municipalityId)
                        .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", municipalityId));
            }
            if (currentUser.getMunicipality() != null) {
                return currentUser.getMunicipality();
            }
            throw new BusinessException(
                    "Super admin olarak departman eklerken municipalityId zorunludur.",
                    "MUNICIPALITY_ID_REQUIRED");
        }

        if (currentUser.getMunicipality() == null) {
            throw new BusinessException("Departman olusturmak icin belediye kapsami gerekli", "MUNICIPALITY_REQUIRED");
        }
        if (blankToNull(requestedMunicipalityId) != null) {
            throw new BusinessException("Belediye alani yalnizca super admin tarafindan kullanilabilir.", "MUNICIPALITY_SCOPE");
        }
        return currentUser.getMunicipality();
    }

    private Department findDepartmentForUser(String departmentId, AppUser currentUser) {
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            return departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Departman", "id", departmentId));
        }
        if (currentUser.getMunicipality() == null) {
            throw new BusinessException("Bu islem icin belediye kapsami gerekli", "MUNICIPALITY_REQUIRED");
        }
        return departmentRepository.findByIdAndMunicipalityId(departmentId, currentUser.getMunicipality().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Departman", "id", departmentId));
    }

    private boolean existsByNameInScope(String name, String municipalityId) {
        if (municipalityId == null) {
            return departmentRepository.existsByName(name);
        }
        return departmentRepository.existsByNameAndMunicipalityId(name, municipalityId);
    }

    private String resolveUniqueSlug(String requestedSlug, String name, String municipalityId, String currentDepartmentId) {
        String base = slugify(blankToNull(requestedSlug) != null ? requestedSlug : name);
        if (base.isBlank()) {
            base = "department";
        }

        String candidate = base;
        int suffix = 2;
        while (isSlugTaken(candidate, municipalityId, currentDepartmentId)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private boolean isSlugTaken(String candidate, String municipalityId, String currentDepartmentId) {
        if (municipalityId == null) {
            return false;
        }
        return departmentRepository.findByMunicipalityIdAndSlugIgnoreCase(municipalityId, candidate)
                .filter(existing -> currentDepartmentId == null || !existing.getId().equals(currentDepartmentId))
                .isPresent();
    }

    private DepartmentResponse mapToResponse(Department department) {
        Municipality municipality = department.getMunicipality();
        String municipalityName = null;
        String municipalitySlug = null;
        if (municipality != null) {
            municipalityName = municipality.getDisplayName() != null && !municipality.getDisplayName().isBlank()
                    ? municipality.getDisplayName()
                    : municipality.getName();
            municipalitySlug = municipality.getSlug();
        }

        return new DepartmentResponse(
                department.getId(),
                department.getName(),
                department.getSlug(),
                department.getDescription(),
                department.isActive(),
                municipality != null ? municipality.getId() : null,
                municipalityName,
                municipalitySlug,
                municipalitySlug != null ? buildPublicPath(municipalitySlug, department.getSlug()) : null
        );
    }

    public static String buildPublicPath(String municipalitySlug, String departmentSlug) {
        return "/belediye/" + municipalitySlug + "/departments/" + departmentSlug;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    static String slugify(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(java.util.Locale.ROOT)
                .replace("ı", "i")
                .replace("ß", "ss");
        return normalized
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }
}
