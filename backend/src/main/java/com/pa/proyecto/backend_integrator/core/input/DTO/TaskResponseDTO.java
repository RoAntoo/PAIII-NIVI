package com.pa.proyecto.backend_integrator.core.input.DTO;

import com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskSource;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskCategory;
import com.pa.proyecto.backend_integrator.core.model.Task;
import java.time.LocalDateTime;

public record TaskResponseDTO(
        Long id,
        String title,
        Integer estimateHours,
        String assignee,
        TaskStatus status,
        LocalDateTime finishedAt,
        LocalDateTime createdAt,
        Long projectId,
        TaskSource source,
        TaskCategory category,
        java.util.UUID clientRequestId
) {
    /** Maps all existing task fields and mobile metadata to the HTTP response. */
    public static TaskResponseDTO from(Task task) {
        return new TaskResponseDTO(task.getId(), task.getTitle(), task.getEstimateHours(),
                task.getAssignee(), task.getStatus(), task.getFinishedAt(), task.getCreatedAt(),
                task.getProject().getId(), task.getSource(), task.getCategory(), task.getClientRequestId());
    }
}
