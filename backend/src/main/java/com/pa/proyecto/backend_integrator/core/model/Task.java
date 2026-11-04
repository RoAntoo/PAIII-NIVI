package com.pa.proyecto.backend_integrator.core.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private Integer estimateHours;
    private String assignee;

    @Enumerated(EnumType.STRING)
    private TaskStatus status;

    private LocalDateTime finishedAt;
    private LocalDateTime createdAt;

    // --- ¡ACA ESTA DE FORMA EXPLICITA LA RELACION! ---
    // Muchas Tareas pertenecen a Un Proyecto
    // @JoinColumn le dice a JPA que esta tabla (tasks) tendrá una
    // columna llamada 'project_id' que es la Foreign Key.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnoreProperties("tasks")
    private Project project;


    // --- CONSTRUCTOR Y FACTORY ---
    private Task(Project project, String title, Integer estimateHours,
                 String assignee, TaskStatus status, LocalDateTime createdAt) {
        this.project = project;
        this.title = title;
        this.estimateHours = estimateHours;
        this.assignee = assignee;
        this.status = status;
        this.createdAt = createdAt;
        if (status == TaskStatus.DONE) {
            this.finishedAt = createdAt;
        }
    }

    public static Task create(Project project, String title, Integer estimateHours,
                              String assignee, TaskStatus status, LocalDateTime createdAtTimestamp) {

        if (project == null) {
            throw new IllegalArgumentException("Project is required");
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Task title is required");
        }
        if (estimateHours == null || estimateHours <= 0) {
            throw new IllegalArgumentException("Estimate hours must be greater than 0");
        }
        if (project.getStatus() == ProjectStatus.CLOSED) {
            throw new IllegalArgumentException("Cannot add a task to a CLOSED project");
        }

        return new Task(project, title, estimateHours, assignee, status, createdAtTimestamp);
    }

    public void setStatus(TaskStatus newStatus, LocalDateTime timestamp) {
        if (newStatus == TaskStatus.DONE && this.status != TaskStatus.DONE) {
            this.finishedAt = timestamp;
        } else if (newStatus != TaskStatus.DONE) {
            this.finishedAt = null;
        }
        this.status = newStatus;
    }

    // --- Equals y HashCode ---
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Task task = (Task) o;
        return id != null && Objects.equals(id, task.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}