package com.pa.proyecto.backend_integrator.core.input.DTO;

import java.time.LocalDate;

public record UpdateProjectDTO(
        String name,
        LocalDate startDate,
        LocalDate endDate,
        String description
) {}