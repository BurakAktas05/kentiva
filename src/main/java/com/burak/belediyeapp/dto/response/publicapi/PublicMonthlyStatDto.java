package com.burak.belediyeapp.dto.response.publicapi;

public record PublicMonthlyStatDto(
        String month,
        long opened,
        long resolved
) {}
