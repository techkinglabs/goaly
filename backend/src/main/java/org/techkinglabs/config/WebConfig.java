package org.techkinglabs.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebConfig.class);

    @Value("${app.cors.allowed-origins:}")
    private String[] allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        CorsRegistration registration = registry.addMapping("/api/**")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .maxAge(3600);

        if (Arrays.stream(allowedOrigins).anyMatch(o -> o!= null &&!o.isBlank() &&!o.trim().isEmpty())) {
            registration.allowedOrigins(allowedOrigins);
            registration.allowCredentials(true);
        } else {
            log.warn("No CORS origins configured (app.cors.allowed-origins). Falling back to wildcard with credentials disabled.");
            registration.allowedOriginPatterns("*");
            registration.allowCredentials(false);
        }
    }
}
