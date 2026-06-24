package com.burak.belediyeapp.dto.request.municipality;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Süper admin: belediye + ilk yönetici + varsayılan kategoriler tek istekte.
 */
public record MunicipalityOnboardingRequest(
        @NotNull @Valid MunicipalityPart municipality,
        @NotNull @Valid AdminPart admin,
        @Valid WhiteDeskPart whiteDesk,
        List<@Valid DepartmentPart> departments,
        @NotEmpty List<@Valid CategoryPart> categories
) {
    public record MunicipalityPart(
            @NotBlank @Size(max = 100) String name,
            @Size(max = 120) String slug,
            @Size(max = 150) String displayName,
            Double centerLat,
            Double centerLng,
            Integer defaultZoom,
            @Size(max = 255) String slogan,
            String parentMunicipalityId,
            String workflowMode,
            Long districtId,
            String memberId
    ) {}

    public record AdminPart(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotBlank @Size(min = 2, max = 160) String fullName,
            @Size(max = 20) String phone
    ) {}

    public record WhiteDeskPart(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotBlank @Size(min = 2, max = 160) String fullName,
            @Size(max = 20) String phone
    ) {}

    public record DepartmentPart(
            @NotBlank @Size(min = 2, max = 100) String name,
            @Size(max = 120) String slug,
            @Size(max = 255) String description
    ) {}

    public record CategoryPart(
            @NotBlank @Size(min = 2, max = 100) String name,
            @Size(max = 255) String description,
            @Size(max = 50) String iconCode
    ) {}
}
