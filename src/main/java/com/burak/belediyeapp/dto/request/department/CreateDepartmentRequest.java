package com.burak.belediyeapp.dto.request.department;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDepartmentRequest(
        @NotBlank(message = "Departman adi bos birakilamaz")
        @Size(min = 2, max = 100)
        String name,

        @Size(max = 120)
        String slug,

        @Size(max = 255)
        String description,

        /**
         * Super admin: departmanin baglanacagi belediye
         * (kendi hesabinda belediye yokken zorunlu).
         */
        String municipalityId
) {}
