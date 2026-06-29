package com.burak.belediyeapp.tenant;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Department;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Kiracı (belediye) erişim kurallarının tek merkezi.
 * Staff işlemlerinde municipality kapsamı buradan doğrulanır.
 */
@Service
@Slf4j
public class TenantAccessService {

    public boolean isSuperAdmin(AppUser user) {
        return user != null && user.hasRole("ROLE_SUPER_ADMIN");
    }

    public boolean isCitizenOnly(AppUser user) {
        return user != null
                && user.hasRole("ROLE_CITIZEN")
                && !user.hasRole("ROLE_FIELD_OFFICER")
                && !user.hasRole("ROLE_DEPT_MANAGER")
                && !user.hasRole("ROLE_ADMIN")
                && !user.hasRole("ROLE_SUPER_ADMIN")
                && !user.hasRole("ROLE_WHITE_DESK");
    }

    public boolean isWhiteDesk(AppUser user) {
        return user != null && user.hasRole("ROLE_WHITE_DESK");
    }

    /**
     * Staff için zorunlu belediye kimliği; süper admin için boş (tüm kiracılar).
     */
    public Optional<String> staffMunicipalityScope(AppUser user) {
        if (user == null) {
            throw new BusinessException("Oturum gerekli", "UNAUTHORIZED");
        }
        if (isSuperAdmin(user)) {
            return Optional.empty();
        }
        if (user.getMunicipality() == null) {
            throw new BusinessException("Bu işlem için belediye kapsamı gerekli.", "MUNICIPALITY_REQUIRED");
        }
        return Optional.of(user.getMunicipality().getId());
    }

    public String requireStaffMunicipalityId(AppUser user) {
        return staffMunicipalityScope(user)
                .orElseThrow(() -> new BusinessException(
                        "Bu işlem süper admin için belediye seçimi gerektirir.",
                        "MUNICIPALITY_REQUIRED"));
    }

    public void ensureSameMunicipality(AppUser user, Municipality target) {
        if (isSuperAdmin(user)) {
            return;
        }
        Optional<String> scope = staffMunicipalityScope(user);
        if (target == null || !scope.get().equals(target.getId())) {
            throw new BusinessException("Bu kaynağa erişim yetkiniz yok", "CROSS_MUNICIPALITY_ACCESS");
        }
    }

    public void ensureDepartmentInScope(Department department, AppUser user) {
        if (department == null) {
            return;
        }
        if (isSuperAdmin(user)) {
            return;
        }
        Municipality deptMuni = department.getMunicipality();
        if (deptMuni == null || user.getMunicipality() == null
                || !deptMuni.getId().equals(user.getMunicipality().getId())) {
            throw new BusinessException("Başka belediyeye ait departman seçilemez", "CROSS_MUNICIPALITY_ACCESS");
        }
    }

    public void ensureCanViewReport(Report report, AppUser user) {
        if (user == null) {
            throw new BusinessException("Oturum gerekli", "UNAUTHORIZED");
        }
        if (isSuperAdmin(user)) {
            return;
        }
        if (report.isHiddenFromMunicipality()) {
            if (report.getReporter() != null && report.getReporter().getId().equals(user.getId())) {
                return;
            }
            throw new BusinessException("Bu rapora erişim yetkiniz yok", "ACCESS_DENIED");
        }
        if (isCitizenOnly(user)) {
            if (report.getReporter() != null && report.getReporter().getId().equals(user.getId())) {
                return;
            }
            throw new BusinessException("Bu rapora erişim yetkiniz yok", "ACCESS_DENIED");
        }
        if (user.getMunicipality() == null
                || report.getMunicipality() == null
                || !report.getMunicipality().getId().equals(user.getMunicipality().getId())) {
            throw new BusinessException("Bu rapora erişim yetkiniz yok", "CROSS_MUNICIPALITY_ACCESS");
        }
    }

    public void ensureCategoryVisibleToMunicipality(
            com.burak.belediyeapp.entity.ReportCategory category, String municipalityId) {
        if (category.getMunicipality() == null) {
            return;
        }
        if (municipalityId == null
                || !category.getMunicipality().getId().equals(municipalityId)) {
            throw new BusinessException(
                    "Seçilen kategori bu belediye için geçerli değil.",
                    "CATEGORY_MUNICIPALITY_MISMATCH");
        }
    }
}
