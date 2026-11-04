package com.pa.proyecto.backend_integrator.core.input.DTO;

import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import java.time.LocalDate;

public record CreateProjectDTO(
        String name,
        LocalDate startDate,
        LocalDate endDate,
        ProjectStatus status,
        String description
) {
}