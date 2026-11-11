package com.pa.proyecto.backend_integrator;

import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.assertFalse;

class ArchitectureTest {
    @Test
    void coreDoesNotDependOnPersistenceWebOrSpring() throws Exception {
        Path root = Path.of("src/main/java/com/pa/proyecto/backend_integrator/core");
        try (var sources = Files.walk(root)) {
            for (Path source : sources.filter(p -> p.toString().endsWith(".java")).toList()) {
                String code = Files.readString(source);
                for (String forbidden : new String[]{"org.springframework", "jakarta.persistence", "com.pa.proyecto.backend_integrator.adapter", "com.fasterxml.jackson"}) {
                    assertFalse(code.contains(forbidden), source + " depends on " + forbidden);
                }
            }
        }
    }
}
