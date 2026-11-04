package com.pa.proyecto.backend_integrator.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.config.annotation.*;
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Value("${app.cors.allowed-origins:http://localhost:4200}") private String[] origins;
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/projects/**").allowedOrigins(origins).allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    }
}
