package com.pa.proyecto.backend_integrator.core.input.DTO;

import com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskSource;
import com.pa.proyecto.backend_integrator.core.model.enums.TaskCategory;

public record CreateTaskDTO(
        String title,
        Integer estimateHours,
        String assignee,
        TaskStatus status,
        TaskSource source,
        TaskCategory category,
        java.util.UUID clientRequestId
) {
    /** Preserves the legacy constructor by leaving new optional metadata unspecified. */
    public CreateTaskDTO(String title, Integer estimateHours, String assignee, TaskStatus status) {
        this(title, estimateHours, assignee, status, null, null, null);
    }
}
