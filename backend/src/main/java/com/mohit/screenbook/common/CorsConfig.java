package com.mohit.screenbook.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * The frontend and the API are on different origins: localhost:3000 and
 * localhost:8082 in development, Vercel and Render in production. A browser
 * blocks every cross-origin call unless the server says otherwise, so without
 * this the live frontend fails on the first request with nothing in the
 * backend log, because the request never arrives.
 *
 * Origins come from configuration, not from source, so the Vercel URL is set on
 * Render and nothing here changes between environments.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    CorsConfig(@Value("${screenbook.cors.allowed-origins}") String[] allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                /* Patterns rather than plain origins, so a Vercel preview
                   wildcard is possible later without changing this code. */
                .allowedOriginPatterns(allowedOrigins)
                /* Only what the client actually uses. A wildcard here would
                   advertise methods this API does not have. */
                .allowedMethods("GET", "POST", "DELETE")
                .allowedHeaders("Content-Type", "Accept")
                /* Cross-origin JavaScript cannot read Location unless it is
                   exposed, and POST /api/holds returns one. */
                .exposedHeaders("Location")
                /* No cookies or auth headers: a hold id is the capability, and
                   it travels in the URL. Keeping this false also avoids the
                   rule that forbids credentials alongside a wildcard origin. */
                .allowCredentials(false)
                /* Cache the preflight, so the browser does not send an OPTIONS
                   before every single POST. */
                .maxAge(3600);
    }
}
