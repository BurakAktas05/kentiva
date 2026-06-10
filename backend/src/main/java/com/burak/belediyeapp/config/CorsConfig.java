package com.burak.belediyeapp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS ayarları — Frontend (Web Dashboard) ve Mobil uygulamaların
 * backend API'ye erişebilmesi için gereklidir.
 */
@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${app.cors.allowed-origin-patterns:}")
    private String allowedOriginPatterns;

    @Value("${spring.profiles.active:}")
    private String activeProfiles;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Credentials açıkken wildcard origin kullanmak prod'da tenant verisi sızıntısına yol açabilir.
        List<String> patterns = parseCsv(allowedOriginPatterns);
        List<String> origins = parseCsv(allowedOrigins);
        
        boolean isProd = activeProfiles != null && activeProfiles.contains("prod");
        if (isProd) {
            if (!origins.isEmpty()) {
                configuration.setAllowedOrigins(origins);
            }
        } else {
            if (!patterns.isEmpty()) {
                configuration.setAllowedOriginPatterns(patterns);
            }
            if (!origins.isEmpty()) {
                configuration.setAllowedOrigins(origins);
            }
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> parseCsv(String value) {
        return java.util.Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList();
    }
}
