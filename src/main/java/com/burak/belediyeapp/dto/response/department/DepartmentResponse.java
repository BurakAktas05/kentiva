package com.burak.belediyeapp.dto.response.department;

public record DepartmentResponse(
        String id,
        String name,
        String description,
        boolean active,
        String municipalityId,
        String municipalityName
) {}
