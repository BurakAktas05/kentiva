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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final IReportCategoryRepository categoryRepository;
    private final IDepartmentRepository departmentRepository;

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "categories", key = "'active'")
    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findAllByActiveTrue().stream()
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
    @org.springframework.cache.annotation.CacheEvict(value = "categories", allEntries = true)
    public CategoryResponse createCategory(CreateCategoryRequest request, AppUser currentUser) {
        if (categoryRepository.existsByName(request.name())) {
            throw new BusinessException("Bu kategori adı zaten mevcut: " + request.name(), "CATEGORY_ALREADY_EXISTS");
        }

        ReportCategory category = ReportCategory.builder()
                .name(request.name())
                .description(request.description())
                .iconCode(request.iconCode())
                .build();

        if (request.departmentId() != null && !request.departmentId().isBlank()) {
            Department dept = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Departman", "id", request.departmentId()));
            ensureDepartmentInScope(dept, currentUser);
            category.setDepartment(dept);
        } else if (!currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            throw new BusinessException("Belediye adminleri kategori oluştururken kendi departmanını seçmelidir", "DEPARTMENT_REQUIRED");
        }

        return mapToResponse(categoryRepository.save(category));
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "categories", allEntries = true)
    public void deleteCategory(String categoryId, AppUser currentUser) {
        ReportCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Kategori", "id", categoryId));
        if (category.getDepartment() != null) {
            ensureDepartmentInScope(category.getDepartment(), currentUser);
        } else if (!currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            throw new BusinessException("Global kategorileri yalnızca super admin yönetebilir", "GLOBAL_CATEGORY_RESTRICTED");
        }
        category.setActive(false);
        categoryRepository.save(category);
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

    private CategoryResponse mapToResponse(ReportCategory category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getIconCode()
        );
    }
}
