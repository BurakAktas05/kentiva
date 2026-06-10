package com.burak.belediyeapp.dto.request.user;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SuspendUserRequest(
        @NotNull(message = "Askıya alma süresi belirtilmelidir")
        @Min(value = 1, message = "Askıya alma süresi en az 1 gün olmalıdır")
        Integer durationDays,

        @NotBlank(message = "Askıya alma gerekçesi belirtilmelidir")
        String reason
) {}
