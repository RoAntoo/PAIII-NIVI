package com.pa.proyecto.backend_integrator.core.model;

import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import java.time.LocalDate;

/** Read model with task counts, without materializing task collections. */
public record ProjectSummary(Long id, String name, LocalDate startDate, LocalDate endDate,
                             ProjectStatus status, String description,
                             long totalTasks, long completedTasks) {}
