package com.pa.proyecto.backend_integrator.core.usecase;

import com.pa.proyecto.backend_integrator.core.exception.BusinessRuleViolationException;
import com.pa.proyecto.backend_integrator.core.exception.DuplicateResourceException;
import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import com.pa.proyecto.backend_integrator.core.input.IUpdateProjectInput;
import com.pa.proyecto.backend_integrator.core.input.DTO.UpdateProjectDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;

import java.time.LocalDate;
import java.util.Objects;

public class UpdateProjectUseCase implements IUpdateProjectInput {

    private final IProjectRepository projectRepository;

    public UpdateProjectUseCase(IProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @Override
    public Project updateProject(Long projectId, UpdateProjectDTO dto) {

        Project existingProject = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        if (dto.name() != null && !dto.name().isBlank() && !Objects.equals(dto.name(), existingProject.getName())) {

            if (projectRepository.existsByName(dto.name())) {
                throw new DuplicateResourceException("Project with name '" + dto.name() + "' already exists.");
            }
            existingProject.setName(dto.name());
        }

        LocalDate finalStartDate = (dto.startDate() != null) ? dto.startDate() : existingProject.getStartDate();
        LocalDate finalEndDate = (dto.endDate() != null) ? dto.endDate() : existingProject.getEndDate();

        if (finalEndDate.isBefore(finalStartDate)) {
            throw new BusinessRuleViolationException("Project end date must be after start date.");
        }

        if(dto.startDate() != null) existingProject.setStartDate(finalStartDate);
        if(dto.endDate() != null) existingProject.setEndDate(finalEndDate);

        if (dto.description() != null) {
            existingProject.setDescription(dto.description());
        }

        return projectRepository.save(existingProject);
    }
}