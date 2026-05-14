package com.burak.belediyeapp.service.department;

import com.burak.belediyeapp.audit.AuditAction;
import com.burak.belediyeapp.dto.request.department.CreateDepartmentRequest;
import com.burak.belediyeapp.dto.request.department.UpdateDepartmentRequest;
import com.burak.belediyeapp.dto.response.department.DepartmentResponse;
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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DepartmentService {

    private final IDepartmentRepository departmentRepository;
    private final IMunicipalityRepository municipalityRepository;

    @Transactional(readOnly = true)
    public List<DepartmentResponse> getAllDepartments(com.burak.belediyeapp.entity.AppUser currentUser) {
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            return departmentRepository.findAll().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        } else if (currentUser.getMunicipality() != null) {
            return departmentRepository.findByMunicipalityId(currentUser.getMunicipality().getId()).stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }
        return List.of();
    }

    @Transactional
    @AuditAction(action = "DEPARTMENT_CREATE", description = "Yeni departman oluşturuldu")
    public DepartmentResponse createDepartment(CreateDepartmentRequest request, com.burak.belediyeapp.entity.AppUser currentUser) {
        Municipality targetMunicipality;
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            String mid = request.municipalityId() != null ? request.municipalityId().trim() : null;
            if (mid != null && !mid.isBlank()) {
                targetMunicipality = municipalityRepository.findById(mid)
                        .orElseThrow(() -> new ResourceNotFoundException("Belediye", "id", mid));
            } else if (currentUser.getMunicipality() != null) {
                targetMunicipality = currentUser.getMunicipality();
            } else {
                throw new BusinessException(
                        "Süper admin olarak departman eklerken hedef belediyeyi seçmelisiniz (municipalityId).",
                        "MUNICIPALITY_ID_REQUIRED");
            }
        } else {
            if (currentUser.getMunicipality() == null) {
                throw new BusinessException("Departman oluşturmak için belediye kapsamı gerekli", "MUNICIPALITY_REQUIRED");
            }
            if (request.municipalityId() != null && !request.municipalityId().isBlank()) {
                throw new BusinessException("Belediye alanı yalnızca süper admin tarafından kullanılabilir.", "MUNICIPALITY_SCOPE");
            }
            targetMunicipality = currentUser.getMunicipality();
        }

        String municipalityId = targetMunicipality.getId();
        if (existsByNameInScope(request.name(), municipalityId)) {
            throw new BusinessException("Bu departman adı bu belediyede zaten kullanımda: " + request.name(), "DEPARTMENT_NAME_EXISTS");
        }

        Department department = Department.builder()
                .name(request.name())
                .description(request.description())
                .active(true)
                .municipality(targetMunicipality)
                .build();

        Department saved = departmentRepository.save(department);
        log.info("Departman oluşturuldu: {} (belediye={})", saved.getName(), municipalityId);
        return mapToResponse(saved);
    }

    @Transactional
    @AuditAction(action = "DEPARTMENT_UPDATE", description = "Departman güncellendi")
    public DepartmentResponse updateDepartment(String departmentId, UpdateDepartmentRequest request,
                                               com.burak.belediyeapp.entity.AppUser currentUser) {
        Department department = findDepartmentForUser(departmentId, currentUser);

        String municipalityId = department.getMunicipality() != null ? department.getMunicipality().getId() : null;
        if (!department.getName().equals(request.name()) && existsByNameInScope(request.name(), municipalityId)) {
            throw new BusinessException("Bu departman adı bu belediyede zaten kullanımda: " + request.name(), "DEPARTMENT_NAME_EXISTS");
        }

        department.setName(request.name());
        department.setDescription(request.description());
        if (request.isActive() != null) {
            department.setActive(request.isActive());
        }

        Department saved = departmentRepository.save(department);
        log.info("Departman güncellendi: {}", saved.getName());
        return mapToResponse(saved);
    }

    @Transactional
    @AuditAction(action = "DEPARTMENT_DELETE", description = "Departman devre dışı bırakıldı")
    public void deleteDepartment(String departmentId, com.burak.belediyeapp.entity.AppUser currentUser) {
        Department department = findDepartmentForUser(departmentId, currentUser);
        department.setActive(false);
        departmentRepository.save(department);
        log.info("Departman devre dışı bırakıldı: {}", department.getName());
    }

    private Department findDepartmentForUser(String departmentId, com.burak.belediyeapp.entity.AppUser currentUser) {
        if (currentUser.hasRole("ROLE_SUPER_ADMIN")) {
            return departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Departman", "id", departmentId));
        }
        if (currentUser.getMunicipality() == null) {
            throw new BusinessException("Bu işlem için belediye kapsamı gerekli", "MUNICIPALITY_REQUIRED");
        }
        return departmentRepository
                .findByIdAndMunicipalityId(departmentId, currentUser.getMunicipality().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Departman", "id", departmentId));
    }

    private boolean existsByNameInScope(String name, String municipalityId) {
        if (municipalityId == null) {
            return departmentRepository.existsByName(name);
        }
        return departmentRepository.existsByNameAndMunicipalityId(name, municipalityId);
    }

    private DepartmentResponse mapToResponse(Department dept) {
        Municipality m = dept.getMunicipality();
        String mName = null;
        if (m != null) {
            mName = m.getDisplayName() != null && !m.getDisplayName().isBlank() ? m.getDisplayName() : m.getName();
        }
        return new DepartmentResponse(
                dept.getId(),
                dept.getName(),
                dept.getDescription(),
                dept.isActive(),
                m != null ? m.getId() : null,
                mName
        );
    }
}
