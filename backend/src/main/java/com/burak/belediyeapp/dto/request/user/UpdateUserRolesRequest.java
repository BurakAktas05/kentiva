package com.burak.belediyeapp.dto.request.user;

import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public record UpdateUserRolesRequest(
        @NotEmpty(message = "En az bir rol seçilmelidir")
        Set<String> roleNames
) {}
