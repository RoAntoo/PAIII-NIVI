package com.pa.proyecto.backend_integrator.core.model;

import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskSource;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskCategory;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Objects;

@Getter
@Setter
@NoArgsConstructor
public class Task {

    private Long id;
    private String title;
    private Integer estimateHours;
    private String assignee;

    private TaskStatus status;
    private TaskSource source = TaskSource.MANUAL;
    private TaskCategory category = TaskCategory.GENERAL;
    private java.util.UUID clientRequestId;

    private LocalDateTime finishedAt;
    private LocalDateTime createdAt;

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

        if (status == null) throw new IllegalArgumentException("Task status is required");
        if (project == null) {
            throw new IllegalArgumentException("Project is required");
        }
        title = TextRules.required(title, "Task title");
        TextRules.optional(assignee, "Task assignee");
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
