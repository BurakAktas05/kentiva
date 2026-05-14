package com.burak.belediyeapp.dto.response.auth;

import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import java.util.Set;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        String userId,
        String email,
        String fullName,
        Set<String> roles,
        String district,
        MunicipalityDto municipality
) {
    public static AuthResponse of(String accessToken, String refreshToken,
                                   String userId, String email,
                                   String fullName, Set<String> roles,
                                   String district, MunicipalityDto municipality) {
        return new AuthResponse(accessToken, refreshToken, "Bearer",
                userId, email, fullName, roles, district, municipality);
    }
}
