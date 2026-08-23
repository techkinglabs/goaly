package org.example.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * Comma-separated list of allowed origins (e.g. http://localhost:3002,https://app.example.com).
     * Set via APP_CORS_ALLOWED_ORIGINS. When left empty, the requesting Origin is reflected,
     * which lets the app work from any host (e.g. a remote server) without re-listing every origin.
     */
    @Value("${app.cors.allowed-origins:}")
    private String[] allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        CorsRegistration registration = registry.addMapping("/api/**")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowCredentials(true)
                .maxAge(3600);

        if (allowedOrigins != null && allowedOrigins.length > 0 && !allowedOrigins[0].isBlank()) {
            registration.allowedOrigins(allowedOrigins);
        } else {
            // Reflect any requesting origin so remote deployments "just work".
            registration.allowedOriginPatterns("*");
        }
    }
}
