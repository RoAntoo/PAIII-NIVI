package com.pa.proyecto.backend_integrator.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.Map;

/** Runs the schema scripts before Hibernate when it only validates existing tables. */
public class SchemaValidationEnvironmentPostProcessor implements EnvironmentPostProcessor {
    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if ("validate".equalsIgnoreCase(environment.getProperty("spring.jpa.hibernate.ddl-auto"))) {
            environment.getPropertySources().addFirst(new MapPropertySource("niviSchemaValidation",
                    Map.of("spring.jpa.defer-datasource-initialization", false)));
        }
    }
}
