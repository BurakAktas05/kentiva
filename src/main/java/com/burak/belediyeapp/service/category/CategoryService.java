package com.burak.belediyeapp.service.category;

import com.burak.belediyeapp.dto.request.category.CreateCategoryRequest;
import com.burak.belediyeapp.dto.response.category.CategoryResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Department;
import com.burak.belediyeapp.entity.ReportCategory;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.exception.ResourceNotFoundException;
import com.burak.belediyeapp.repository.IDepartmentRepository;
import com.burak.belediyeapp.repository.IReportCategoryRepository;
import com.burak.belediyeapp.config.CacheNames;
import com.burak.belediyeapp.tenant.TenantAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final IReportCategoryRepository categoryRepository;
    private final IDepartmentRepository departmentRepository;
    private final TenantAccessService tenantAccess;

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.CATEGORIES, key = "'active-global'")
    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findAllByActiveTrueAndMunicipalityIsNull().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.CATEGORIES, key = "'muni:' + #municipalityId")
    public List<CategoryResponse> getActiveCategoriesForMunicipality(String municipalityId) {
        return categoryRepository.findAllByActiveTrueAndMunicipalityIsNullOrMunicipality_Id(municipalityId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = CacheNames.CATEGORIES, allEntries = true)
    public CategoryResponse createCategory(CreateCategoryRequest request, AppUser currentUser) {
        ReportCategory category = ReportCategory.builder()
                .name(request.name())
                .description(request.description())
                .iconCode(request.iconCode())
                .build();

        if (request.departmentId() != null && !request.departmentId().isBlank()) {
            Department dept = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Departman", "id", request.departmentId()));
            tenantAccess.ensureDepartmentInScope(dept, currentUser);
            category.setDepartment(dept);
            category.setMunicipality(dept.getMunicipality());
            if (categoryRepository.existsByMunicipalityIdAndName(dept.getMunicipality().getId(), request.name())) {
                throw new BusinessException("Bu kategori adı zaten mevcut: " + request.name(), "CATEGORY_ALREADY_EXISTS");
            }
        } else if (tenantAccess.isSuperAdmin(currentUser)) {
            if (categoryRepository.existsByNameAndMunicipalityIsNull(request.name())) {
                throw new BusinessException("Bu global kategori adı zaten mevcut: " + request.name(), "CATEGORY_ALREADY_EXISTS");
            }
        } else {
            throw new BusinessException("Belediye adminleri kategori oluştururken departman seçmelidir", "DEPARTMENT_REQUIRED");
        }

        return mapToResponse(categoryRepository.save(category));
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = CacheNames.CATEGORIES, allEntries = true)
    public void deleteCategory(String categoryId, AppUser currentUser) {
        ReportCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Kategori", "id", categoryId));
        if (category.getMunicipality() != null) {
            tenantAccess.ensureSameMunicipality(currentUser, category.getMunicipality());
        } else if (!tenantAccess.isSuperAdmin(currentUser)) {
            throw new BusinessException("Global kategorileri yalnızca super admin yönetebilir", "GLOBAL_CATEGORY_RESTRICTED");
        }
        category.setActive(false);
        categoryRepository.save(category);
    }

    private CategoryResponse mapToResponse(ReportCategory category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getIconCode()
        );
    }
}
