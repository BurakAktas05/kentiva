package com.burak.belediyeapp.dto.request.department;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDepartmentRequest(
        @NotBlank(message = "Departman adi bos birakilamaz")
        @Size(min = 2, max = 100)
        String name,

        @Size(max = 120)
        String slug,

        @Size(max = 255)
        String description,

        Boolean isActive
) {}
