package com.burak.belediyeapp.config;

import com.burak.belediyeapp.security.ApiKeyAuthFilter;
import com.burak.belediyeapp.security.JwtAuthFilter;
import com.burak.belediyeapp.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Spring Security ana konfigürasyonu.
 *
 * Mimari kararlar:
 * - Stateless (JWT) session — sunucuda session tutulmaz
 * - CSRF devre dışı — REST API + JWT ile CSRF riski yoktur
 * - @EnableMethodSecurity ile @PreAuthorize kullanımı aktif
 * - Rol bazlı URL erişim kontrolü + method level güvenlik birlikte
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity           // @PreAuthorize, @PostAuthorize aktif
@RequiredArgsConstructor
public class SecurityConfig {

    private final ApiKeyAuthFilter apiKeyAuthFilter;
    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsService;
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CORS aktif — CorsConfig bean'inden alır
            .cors(cors -> cors.configurationSource(corsConfigurationSource))

            // REST API için CSRF kapalı
            .csrf(AbstractHttpConfigurer::disable)

            // Stateless: JWT tabanlı, session tutulmaz
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // URL erişim kuralları
            .authorizeHttpRequests(auth -> auth

                // ── Herkese açık (Kentiva kamu API) ───────────
                .requestMatchers(HttpMethod.GET, "/api/v1/public/**").permitAll()

                // ── Süper admin — belediye SaaS yönetimi ───────
                .requestMatchers("/api/v1/admin/municipalities/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/api/v1/admin/onboarding/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/api/v1/admin/platform/**").hasRole("SUPER_ADMIN")

                // ── Belediye ayarları (tenant) ───────────────
                .requestMatchers(HttpMethod.GET, "/api/v1/municipalities/me")
                    .hasAnyRole("ADMIN", "DEPT_MANAGER", "FIELD_OFFICER")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/municipalities/me/branding").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/municipalities/me/branding/logo").hasRole("ADMIN")

                // ── Entegrasyon (API anahtarı / belediye admin) ─
                .requestMatchers("/api/v1/integration/**").hasRole("API_CLIENT")
                .requestMatchers("/api/v1/municipalities/me/api-keys/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/municipalities/me/integration/**").hasRole("ADMIN")

                // ── Herkese açık ──────────────────────────────
                .requestMatchers("/api/v1/setup/**").permitAll()

                .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
                .requestMatchers("/api/v1/auth/forgot-password", "/api/v1/auth/reset-password").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/auth/me").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/logout").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/media/access").permitAll()

                // ── WebSocket: el sıkışmada JWT (JwtWebSocketHandshakeInterceptor) ──
                .requestMatchers("/ws-belediye/**").permitAll()

                // ── Swagger UI (geliştirme) ───────────────────
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()

                // ── Dashboard istatistik endpoint ─────────────
                .requestMatchers("/api/v1/dashboard/**")
                    .hasAnyRole("DEPT_MANAGER", "ADMIN", "SUPER_ADMIN")

                // ── Vatandaş işlemleri ────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/v1/reports").hasRole("CITIZEN")
                .requestMatchers(HttpMethod.POST, "/api/v1/reports/upload").hasRole("CITIZEN")
                .requestMatchers(HttpMethod.GET, "/api/v1/reports/my").hasRole("CITIZEN")

                // ── Zaman çizelgesi — vatandaş (kendi raporu) + personel
                .requestMatchers(HttpMethod.GET, "/api/v1/reports/*/timeline").authenticated()

                // ── Saha görevlisi: bana atananlar
                .requestMatchers(HttpMethod.GET, "/api/v1/reports/my-assignments").hasRole("FIELD_OFFICER")

                // ── Rapor detay — tüm oturum açmış kullanıcılar (iş kuralı serviste)
                .requestMatchers(HttpMethod.GET, "/api/v1/reports/{reportId}")
                    .authenticated()

                // ── Saha ekibi & üzeri ───────────────────────
                .requestMatchers(HttpMethod.GET, "/api/v1/reports/**")
                    .hasAnyRole("FIELD_OFFICER", "DEPT_MANAGER", "ADMIN", "SUPER_ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/reports/**")
                    .hasAnyRole("FIELD_OFFICER", "DEPT_MANAGER", "ADMIN", "SUPER_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/reports/*/assign")
                    .hasAnyRole("DEPT_MANAGER", "ADMIN", "SUPER_ADMIN")

                // ── Birim müdürü & üzeri ─────────────────────
                .requestMatchers("/api/v1/departments/**")
                    .hasAnyRole("DEPT_MANAGER", "ADMIN", "SUPER_ADMIN")

                // ── Admin & üzeri ─────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/v1/categories/**")
                    .hasAnyRole("ADMIN", "SUPER_ADMIN")

                // ── Bildirim şablonları — admin ─────────────────
                .requestMatchers("/api/v1/report-templates/**")
                    .hasAnyRole("ADMIN", "SUPER_ADMIN")

                // ── Kullanıcı profili — tüm oturum açmış kullanıcılar ──
                .requestMatchers(HttpMethod.GET, "/api/v1/users/me").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/v1/users/me").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/users/me/change-password").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/v1/users/fcm-token").authenticated()

                // ── Kullanıcı yönetimi — yöneticiler ──────────
                .requestMatchers("/api/v1/users/**")
                    .hasAnyRole("DEPT_MANAGER", "ADMIN", "SUPER_ADMIN")

                // ── Export — yöneticiler ───────────────────────
                .requestMatchers("/api/v1/export/**")
                    .hasAnyRole("DEPT_MANAGER", "ADMIN", "SUPER_ADMIN")

                // ── Bildirimler — tüm oturum açmış kullanıcılar ──
                .requestMatchers("/api/v1/notifications/**").authenticated()

                // ── Denetim günlüğü — yalnızca admin ─────────
                .requestMatchers("/api/v1/audit-logs/**")
                    .hasAnyRole("ADMIN", "SUPER_ADMIN")

                // ── Actuator health — herkese açık ────────────
                .requestMatchers("/actuator/health/**").permitAll()

                // Geri kalan her şey kimlik doğrulama gerektirir
                .anyRequest().authenticated()
            )

            // JWT filter — UsernamePasswordAuthenticationFilter'dan önce çalışır
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(apiKeyAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
