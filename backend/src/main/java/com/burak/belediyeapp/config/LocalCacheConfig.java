package com.burak.belediyeapp.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Redis yokken (varsayılan) JVM içi cache — tek instance için yeterli.
 */
@Configuration
@ConditionalOnProperty(name = "app.cache.type", havingValue = "none", matchIfMissing = true)
public class LocalCacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .recordStats()
                .expireAfterWrite(24, TimeUnit.HOURS)
                .maximumSize(500));
        cacheManager.setCacheNames(List.of(
                CacheNames.CATEGORIES,
                CacheNames.PUBLIC_MUNICIPALITIES,
                CacheNames.MUNICIPALITIES,
                CacheNames.DUTY_PHARMACY,
                CacheNames.DASHBOARD_STATS,
                CacheNames.DEPARTMENTS,
                CacheNames.WIDGETS,
                CacheNames.PILOT_STATS,
                CacheNames.EXECUTIVE_DASHBOARD
        ));
        return cacheManager;
    }
}
