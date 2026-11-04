//EL test me funciona con la ruta anterior de este paquete¿? la actual y la que deberia ser es la:
// package com.pa.proyecto.backend_integrator.core.model;
package model;

import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

@ExtendWith(MockitoExtension.class)
class ProjectTest {

    private LocalDate today;
    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    void setUp() {
        today = LocalDate.of(2025, 11, 10);
        startDate = LocalDate.of(2025, 11, 15);
        endDate = LocalDate.of(2025, 12, 15);
    }

    @Test
    public void testCreateProject_HappyPath() {
        String name = "Proyecto Válido";
        ProjectStatus status = ProjectStatus.PLANNED;
        String description = "Desc...";

        Project project = Project.create(name, startDate, endDate, status, description, today);

        Assertions.assertNotNull(project);
        Assertions.assertEquals(name, project.getName());
    }

    @Test
    public void testCreateProject_ValidationExceptions() {
        // Test 1: Nombre nulo
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            Project.create(null, startDate, endDate, ProjectStatus.PLANNED, "Desc", today);
        });

        // Test 2: Nombre blank
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            Project.create(" ", startDate, endDate, ProjectStatus.PLANNED, "Desc", today);
        });

        // Test 3: EndDate < StartDate
        LocalDate badEndDate = LocalDate.of(2025, 11, 14);
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            Project.create("Test", startDate, badEndDate, ProjectStatus.PLANNED, "Desc", today);
        });

        // Test 4: EndDate < Today
        LocalDate endDateInThePast = LocalDate.of(2025, 11, 9);
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            Project.create("Test", startDate, endDateInThePast, ProjectStatus.PLANNED, "Desc", today);
        });
    }
}