package com.burak.belediyeapp.dto.response.user;

import java.util.List;

public record UserResponse(
        String id,
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        List<String> roles,
        String district,
        com.burak.belediyeapp.dto.response.municipality.MunicipalityDto municipality
) {}
