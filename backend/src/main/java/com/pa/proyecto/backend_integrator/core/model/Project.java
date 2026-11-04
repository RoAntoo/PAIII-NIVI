package com.pa.proyecto.backend_integrator.core.model;

import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Getter // Lombok crea todos los Getters
@Setter // Lombok crea todos los Setters
@NoArgsConstructor //Lombok crea un constructor vacío
public class Project {

    private Long id;
    private String name;

    private LocalDate startDate;
    private LocalDate endDate;
    private ProjectStatus status;

    private String description;

    // Un Proyecto tiene muchas Tareas
    // mappedBy = "project" le dice a JPA: "La relacion la maneja el campo 'project' en la clase Task"

    private List<Task> tasks = new ArrayList<>();


    // --- CONSTRUCTOR Y FACTORY ---
    private Project(String name, LocalDate startDate, LocalDate endDate,
                    ProjectStatus status, String description) {
        this.name = name;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.description = description;
    }

    // Factory method (sigue igual)
    public static Project create(String name, LocalDate startDate, LocalDate endDate,
                                 ProjectStatus status, String description,
                                 LocalDate today) {
        if (startDate == null || endDate == null || status == null) throw new IllegalArgumentException("Dates and status are required");
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Project name is required");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date must be after start date");
        }
        if (endDate.isBefore(today)) {
            throw new IllegalArgumentException("End date must be today or later");
        }

        return new Project(name, startDate, endDate, status, description);
    }

    public void addTask(Task task) {
        tasks.add(task);
        task.setProject(this);
    }

    // --- Equals y HashCode (basados solo en el ID) ---
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Project project = (Project) o;
        return id != null && Objects.equals(id, project.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}