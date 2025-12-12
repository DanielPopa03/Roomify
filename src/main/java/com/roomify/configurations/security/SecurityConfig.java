package com.roomify.configurations.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. Activate CORS using the bean defined below
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. Disable CSRF (Crucial for APIs to accept POST requests)
                .csrf(csrf -> csrf.disable())

                // 3. Define Permissions
                .authorizeHttpRequests(auth -> auth
                        // Always allow the "Preflight" OPTIONS requests
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()

                        // --- NEW: Allow anyone to view images (Frontend <Image> tag has no token) ---
                        .requestMatchers("/api/properties/images/**").permitAll()

                        // Require authentication for everything else
                        .anyRequest().authenticated()
                )

                // 4. Validate Auth0 Tokens
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(Customizer.withDefaults())
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // --- THE IMPORTANT PART ---
        // Explicitly list your frontend URLs.
        // Using "*" is bad practice and breaks when "AllowCredentials" is true.
        configuration.setAllowedOrigins(List.of(
                "http://localhost:8081",  // React Native Web
                "http://localhost:19006", // Expo Web
                "http://localhost:8080"   // Backend self-test
        ));

        // Allow standard HTTP methods
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // Allow the Authorization header (where your Bearer Token lives)
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));

        // Allow credentials (needed for Auth tokens in some setups)
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}