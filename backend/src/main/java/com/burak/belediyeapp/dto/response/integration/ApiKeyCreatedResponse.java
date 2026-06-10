package com.burak.belediyeapp.dto.response.integration;

import com.burak.belediyeapp.entity.MunicipalityApiKey;
import com.burak.belediyeapp.integration.ApiKeyScope;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

public record ApiKeyCreatedResponse(
        String id,
        String name,
        String apiKey,
        List<String> scopes,
        boolean active,
        LocalDateTime createdAt
) {
    public static ApiKeyCreatedResponse of(MunicipalityApiKey entity, String plainKey) {
        List<String> scopes = Arrays.asList(ApiKeyScope.parse(entity.getScopes()).toArray(new String[0]));
        return new ApiKeyCreatedResponse(
                entity.getId(),
                entity.getName(),
                plainKey,
                scopes,
                entity.isActive(),
                entity.getCreatedAt()
        );
    }
}
