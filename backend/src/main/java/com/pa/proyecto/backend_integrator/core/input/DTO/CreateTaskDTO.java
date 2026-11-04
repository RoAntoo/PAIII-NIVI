package com.pa.proyecto.backend_integrator.core.input.DTO;

import com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus;

public record CreateTaskDTO(
        String title,
        Integer estimateHours,
        String assignee,
        TaskStatus status
) {
}