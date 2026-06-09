package com.burak.belediyeapp.dto.response.transit;

import java.util.List;
import java.util.Map;

public record BusRouteDto(
        String id,
        String name,
        String code,
        List<String> stops,
        String color,
        String icon,
        Map<String, Object> schedule,
        boolean starred
) {}
