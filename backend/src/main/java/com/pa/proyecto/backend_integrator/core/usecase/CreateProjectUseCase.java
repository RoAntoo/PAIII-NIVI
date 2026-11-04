package com.pa.proyecto.backend_integrator.core.usecase;

import com.pa.proyecto.backend_integrator.core.exception.BusinessRuleViolationException;
import com.pa.proyecto.backend_integrator.core.exception.DuplicateResourceException;
import com.pa.proyecto.backend_integrator.core.input.ICreateProjectInput;
import com.pa.proyecto.backend_integrator.core.input.DTO.CreateProjectDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;

import java.time.Clock;
import java.time.LocalDate;

public class CreateProjectUseCase implements ICreateProjectInput {

    private final IProjectRepository projectRepository;
    private final Clock clock;

    public CreateProjectUseCase(IProjectRepository projectRepository, Clock clock) {
        this.projectRepository = projectRepository;
        this.clock = clock;
    }

    @Override
    public Project createProject(CreateProjectDTO dto) {

        if (dto.name() == null || dto.name().isBlank()) {
            throw new IllegalArgumentException("Project name is required");
        }
        if (dto.startDate() == null) {
            throw new IllegalArgumentException("Project start date is required");
        }
        if (dto.endDate() == null) {
            throw new IllegalArgumentException("Project end date is required");
        }

        if (projectRepository.existsByName(dto.name())) {
            throw new DuplicateResourceException("Project with name '" + dto.name() + "' already exists.");
        }

        if (dto.endDate().isBefore(dto.startDate())) {
            throw new BusinessRuleViolationException("Project end date must be after start date.");
        }

        LocalDate today = LocalDate.now(clock);
        if (dto.endDate().isBefore(today)) {
            throw new BusinessRuleViolationException("Project end date must be today or in the future.");
        }

        Project newProject = Project.create(
                dto.name(),
                dto.startDate(),
                dto.endDate(),
                dto.status(),
                dto.description(),
                today
        );

        return projectRepository.save(newProject);
    }
}