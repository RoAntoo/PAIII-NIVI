package com.pa.proyecto.backend_integrator.core.input.DTO;

import com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus;
import java.time.LocalDateTime;

public record TaskResponseDTO(
        Long id,
        String title,
        Integer estimateHours,
        String assignee,
        TaskStatus status,
        LocalDateTime finishedAt,
        LocalDateTime createdAt,
        Long projectId // <-- La clave
) {
}