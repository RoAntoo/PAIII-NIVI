package com.pa.proyecto.backend_integrator.core.usecase;

import com.pa.proyecto.backend_integrator.core.exception.BusinessRuleViolationException;
import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import com.pa.proyecto.backend_integrator.core.input.ITaskCreateInput;
import com.pa.proyecto.backend_integrator.core.input.DTO.CreateTaskDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;
import com.pa.proyecto.backend_integrator.core.output.ITaskRepository;

import java.time.Clock;
import java.time.LocalDateTime;

public class CreateTaskUseCase implements ITaskCreateInput {

    private final IProjectRepository projectRepository;
    private final ITaskRepository taskRepository;
    private final Clock clock;

    public CreateTaskUseCase(IProjectRepository projectRepository,
                             ITaskRepository taskRepository,
                             Clock clock) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.clock = clock;
    }

    @Override
    public Task createTask(Long projectId, CreateTaskDTO dto) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new
                        ResourceNotFoundException("Project not found with id: " + projectId));

        if (project.getStatus().equals(ProjectStatus.CLOSED)) {
            throw new BusinessRuleViolationException("Cannot add a task to a CLOSED project");
        }

        LocalDateTime now = LocalDateTime.now(clock);

        Task task = Task.create(
                project,
                dto.title(),
                dto.estimateHours(),
                dto.assignee(),
                dto.status(),
                now
        );

        return taskRepository.save(task);
    }
}