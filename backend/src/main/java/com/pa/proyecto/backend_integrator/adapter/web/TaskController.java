package com.pa.proyecto.backend_integrator.adapter.web;

import com.pa.proyecto.backend_integrator.core.input.DTO.CreateTaskDTO;
import com.pa.proyecto.backend_integrator.core.input.DTO.TaskResponseDTO;
import com.pa.proyecto.backend_integrator.core.input.DTO.UpdateTaskDTO;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.usecase.CreateTaskUseCase;
import com.pa.proyecto.backend_integrator.core.usecase.UpdateTaskUseCase;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/projects/{projectId}/tasks")
public class TaskController {

    private final CreateTaskUseCase createTaskUseCase;
    private final UpdateTaskUseCase updateTaskUseCase;

    public TaskController(CreateTaskUseCase createTaskUseCase, UpdateTaskUseCase updateTaskUseCase) {
        this.createTaskUseCase = createTaskUseCase;
        this.updateTaskUseCase = updateTaskUseCase;
    }

    @PostMapping
    public ResponseEntity<TaskResponseDTO> createTask(
            @PathVariable Long projectId,
            @RequestBody CreateTaskDTO dto) {

        Task createdTask = createTaskUseCase.createTask(projectId, dto);

        TaskResponseDTO response = new TaskResponseDTO(
                createdTask.getId(),
                createdTask.getTitle(),
                createdTask.getEstimateHours(),
                createdTask.getAssignee(),
                createdTask.getStatus(),
                createdTask.getFinishedAt(),
                createdTask.getCreatedAt(),
                createdTask.getProject().getId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<TaskResponseDTO> updateTask(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @RequestBody UpdateTaskDTO dto) {

        Task updatedTask = updateTaskUseCase.updateTask(taskId, dto);

        TaskResponseDTO response = new TaskResponseDTO(
                updatedTask.getId(),
                updatedTask.getTitle(),
                updatedTask.getEstimateHours(),
                updatedTask.getAssignee(),
                updatedTask.getStatus(),
                updatedTask.getFinishedAt(),
                updatedTask.getCreatedAt(),
                updatedTask.getProject().getId()
        );
        return ResponseEntity.ok(response);
    }
}