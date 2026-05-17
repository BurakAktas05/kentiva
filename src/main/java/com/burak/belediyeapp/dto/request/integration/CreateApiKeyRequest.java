package com.burak.belediyeapp.dto.request.integration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateApiKeyRequest(
        @NotBlank @Size(max = 120) String name,
        List<String> scopes
) {}
