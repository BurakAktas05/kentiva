package com.burak.belediyeapp.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

public class RedisUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE = "railwayRedisUrl";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String redisUrl = environment.getProperty("REDIS_URL");
        Map<String, Object> normalized = RedisUrlNormalizer.normalizeFromRedisUrl(redisUrl);
        if (normalized.isEmpty()) {
            return;
        }

        Map<String, Object> toApply = new HashMap<>();
        normalized.forEach((key, value) -> {
            if (!environment.containsProperty(key) || isBlank(environment.getProperty(key))) {
                toApply.put(key, value);
            }
        });
        if (!toApply.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE, toApply));
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 11;
    }
}
