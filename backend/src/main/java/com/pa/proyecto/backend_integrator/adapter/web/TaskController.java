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

@org.springframework.transaction.annotation.Transactional
@RestController
@RequestMapping("/projects/{projectId}/tasks")
public class TaskController {

    @org.springframework.beans.factory.annotation.Autowired
    private com.pa.proyecto.backend_integrator.core.usecase.TaskQueriesUseCase queries;

    private Task requireTask(Long projectId, Long taskId) {
        return queries.get(projectId,taskId);
    }
    private TaskResponseDTO response(Task task) {
        return new TaskResponseDTO(task.getId(), task.getTitle(), task.getEstimateHours(), task.getAssignee(), task.getStatus(), task.getFinishedAt(), task.getCreatedAt(), task.getProject().getId());
    }
    @GetMapping
    public java.util.List<TaskResponseDTO> list(@PathVariable Long projectId) {
        return queries.list(projectId).stream().map(this::response).toList();
    }
    @GetMapping("/{taskId}")
    public TaskResponseDTO get(@PathVariable Long projectId, @PathVariable Long taskId) {
        return response(requireTask(projectId, taskId));
    }

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

        requireTask(projectId, taskId);
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