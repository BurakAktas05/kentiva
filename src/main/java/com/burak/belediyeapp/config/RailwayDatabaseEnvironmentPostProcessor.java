package com.burak.belediyeapp.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * {@code DATABASE_URL} (postgresql://…) değerini jdbc URL + kullanıcı/şifreye dönüştürür.
 * {@code BELEDIYE_DB_URL} veya {@code spring.datasource.url} zaten tanımlıysa dokunulmaz.
 */
public class RailwayDatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE = "railwayDatabaseUrl";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (hasExplicitJdbcUrl(environment)) {
            return;
        }
        String databaseUrl = environment.getProperty("DATABASE_URL");
        Map<String, Object> normalized = DatabaseUrlNormalizer.normalizeFromDatabaseUrl(databaseUrl);
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

    private static boolean hasExplicitJdbcUrl(ConfigurableEnvironment environment) {
        String belediye = environment.getProperty("BELEDIYE_DB_URL");
        if (belediye != null && belediye.startsWith("jdbc:")) {
            return true;
        }
        String springUrl = environment.getProperty("spring.datasource.url");
        return springUrl != null && springUrl.startsWith("jdbc:");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
