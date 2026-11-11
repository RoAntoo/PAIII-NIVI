package com.pa.proyecto.backend_integrator.core.usecase;

import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import com.pa.proyecto.backend_integrator.core.exception.BusinessRuleViolationException;
import com.pa.proyecto.backend_integrator.core.input.IUpdateTaskInput;
import com.pa.proyecto.backend_integrator.core.input.DTO.UpdateTaskDTO;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.model.TextRules;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.output.ITaskRepository;

public class UpdateTaskUseCase implements IUpdateTaskInput {

    private final ITaskRepository taskRepository;
    private final java.time.Clock clock;
    public UpdateTaskUseCase(ITaskRepository taskRepository){
        this(taskRepository, java.time.Clock.systemDefaultZone());
    }
    public UpdateTaskUseCase(ITaskRepository taskRepository, java.time.Clock clock){
        this.taskRepository = taskRepository;
        this.clock = clock;
    }

    @Override
    public Task updateTask(Long id, UpdateTaskDTO dto) {
        Task existingTask = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task with ID " + id + " not found."));

        if (existingTask.getProject().getStatus() == ProjectStatus.CLOSED) {
            throw new BusinessRuleViolationException("Cannot modify a task in a CLOSED project");
        }
        String title = dto.title() == null ? null : TextRules.required(dto.title(), "Task title");
        TextRules.optional(dto.assignee(), "Task assignee");
        if (dto.estimateHours() != null && dto.estimateHours() <= 0) {
            throw new IllegalArgumentException("Estimate hours must be greater than 0");
        }

        // Validate the complete command before mutating the domain object.
        if (title != null) existingTask.setTitle(title);
        if (dto.estimateHours() != null) existingTask.setEstimateHours(dto.estimateHours());
        if (dto.category() != null) existingTask.setCategory(dto.category());
        if (dto.status() != null) existingTask.setStatus(dto.status(),
                java.time.LocalDateTime.now(clock).truncatedTo(java.time.temporal.ChronoUnit.MICROS));

        if (dto.hasAssignee()) {
            existingTask.setAssignee(dto.assignee());
        }

        return taskRepository.save(existingTask);
    }
}
