package com.burak.belediyeapp.dto.response.admin;

public record ApiMetricResponse(
        String apiName,
        String serviceProvider,
        long usageCount,
        long usageLimit,
        int latencyMs,
        double costUSD,
        double budgetUSD,
        String status, // HEALTHY, WARNING, CRITICAL
        String expiryDate,
        double cacheHitRate,
        double errorRate
) {}
