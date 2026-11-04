package com.pa.proyecto.backend_integrator.core.input.DTO;

public record UpdateTaskDTO(
        String title,
        Integer estimateHours,
        String assignee
) {}
