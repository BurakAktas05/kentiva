package com.burak.belediyeapp.dto.request.department;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDepartmentRequest(
        @NotBlank(message = "Departman adı boş bırakılamaz")
        @Size(min = 2, max = 100)
        String name,

        @Size(max = 255)
        String description,

        /**
         * Süper admin: departmanın bağlanacağı belediye (kendi hesabında belediye yokken zorunlu).
         */
        String municipalityId
) {}
