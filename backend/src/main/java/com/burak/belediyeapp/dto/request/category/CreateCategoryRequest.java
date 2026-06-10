package com.burak.belediyeapp.dto.request.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(
        @NotBlank(message = "Kategori adı boş bırakılamaz")
        @Size(min = 2, max = 100)
        String name,

        @Size(max = 255)
        String description,

        @Size(max = 50)
        String iconCode,

        String departmentId
) {}