package com.burak.belediyeapp.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Redis yokken (varsayılan) JVM içi cache — tek instance için yeterli.
 */
@Configuration
@ConditionalOnProperty(name = "app.cache.type", havingValue = "none", matchIfMissing = true)
public class LocalCacheConfig {

    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager(
                CacheNames.CATEGORIES,
                CacheNames.PUBLIC_MUNICIPALITIES,
                CacheNames.MUNICIPALITIES,
                CacheNames.DUTY_PHARMACY,
                CacheNames.DASHBOARD_STATS,
                CacheNames.DEPARTMENTS,
                CacheNames.WIDGETS);
    }
}
