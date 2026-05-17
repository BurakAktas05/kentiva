package com.burak.belediyeapp.dto.response.integration;

import com.burak.belediyeapp.entity.MunicipalityApiKey;
import com.burak.belediyeapp.integration.ApiKeyScope;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

public record ApiKeyListItemResponse(
        String id,
        String name,
        String keyPrefix,
        List<String> scopes,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime lastUsedAt
) {
    public static ApiKeyListItemResponse from(MunicipalityApiKey entity) {
        List<String> scopes = Arrays.asList(ApiKeyScope.parse(entity.getScopes()).toArray(new String[0]));
        return new ApiKeyListItemResponse(
                entity.getId(),
                entity.getName(),
                entity.getKeyPrefix() + "…",
                scopes,
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getLastUsedAt()
        );
    }
}
