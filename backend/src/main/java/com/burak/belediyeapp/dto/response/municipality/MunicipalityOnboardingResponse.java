package com.burak.belediyeapp.dto.response.municipality;

import com.burak.belediyeapp.dto.response.category.CategoryResponse;
import com.burak.belediyeapp.dto.response.user.UserResponse;

import java.util.List;

public record MunicipalityOnboardingResponse(
        MunicipalityDto municipality,
        UserResponse admin,
        List<CategoryResponse> categoriesCreated,
        List<String> categoriesSkipped
) {}
