package com.proyect.CashSpring.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // API: no usa CSRF de formularios
                .csrf(csrf -> csrf.disable())

                // API: sin sesión (más limpio para móvil)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Autenticación: Basic (por ahora)
                .httpBasic(basic -> {})

                // Quitar login web
                .formLogin(form -> form.disable())

                // Proteger todo (o luego ajustamos rutas específicas)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated()
                )
                .build();
    }
}
