package com.pa.proyecto.backend_integrator.core.input.DTO;

import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import java.time.LocalDate;
import java.util.Optional;

public record FindProjectsQueryDTO(
        Optional<ProjectStatus> status,
        Optional<LocalDate> startDate,
        Optional<LocalDate> endDate,
        Optional<Integer> limit
) {
    public FindProjectsQueryDTO {
        if (limit.isPresent() && (limit.get() < 1 || limit.get() > 100)) {
            throw new IllegalArgumentException("Limit must be between 1 and 100");
        }
        if (startDate.isPresent() && endDate.isPresent() && endDate.get().isBefore(startDate.get())) {
            throw new IllegalArgumentException("End date must not be before start date");
        }
    }

    public FindProjectsQueryDTO(Optional<ProjectStatus> status, Optional<LocalDate> startDate,
                                Optional<LocalDate> endDate) {
        this(status, startDate, endDate, Optional.empty());
    }

    public static FindProjectsQueryDTO empty() {
        return new FindProjectsQueryDTO(Optional.empty(), Optional.empty(), Optional.empty());
    }
}
