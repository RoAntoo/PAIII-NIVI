package com.pa.proyecto.backend_integrator.core.usecase;

import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import com.pa.proyecto.backend_integrator.core.exception.BusinessRuleViolationException;
import com.pa.proyecto.backend_integrator.core.input.IUpdateTaskInput;
import com.pa.proyecto.backend_integrator.core.input.DTO.UpdateTaskDTO;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.output.ITaskRepository;

public class UpdateTaskUseCase implements IUpdateTaskInput {

    private final ITaskRepository taskRepository;
    public UpdateTaskUseCase(ITaskRepository taskRepository){
        this.taskRepository = taskRepository;
    }

    @Override
    public Task updateTask(Long id, UpdateTaskDTO dto) {
        Task existingTask = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task with ID " + id + " not found."));

        if (dto.title() != null && !dto.title().isBlank()) {
            existingTask.setTitle(dto.title());
        }

        if (dto.estimateHours() != null) {
            if (dto.estimateHours() <= 0) {
                throw new BusinessRuleViolationException("Estimate hours must be greater than 0");
            }
            existingTask.setEstimateHours(dto.estimateHours());
        }

        if (dto.assignee() != null) {
            existingTask.setAssignee(dto.assignee());
        }

        return taskRepository.save(existingTask);
    }
}