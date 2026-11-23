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
import java.util.Objects;
import java.util.UUID;

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
        return TaskResponseDTO.from(task);
    }
    @GetMapping
    public java.util.List<TaskResponseDTO> list(@PathVariable Long projectId) {
        return queries.list(projectId).stream().map(this::response).toList();
    }
    @GetMapping("/{taskId}")
    public TaskResponseDTO get(@PathVariable Long projectId, @PathVariable Long taskId) {
        return response(requireTask(projectId, taskId));
    }

    @DeleteMapping("/{taskId}")
    /** Deletes a task belonging to this project and returns an empty response. */
    public ResponseEntity<Void> deleteTask(@PathVariable Long projectId, @PathVariable Long taskId,
            @RequestHeader(name = "If-Match", required = false) String version) {
        if (version != null) checkVersion(requireTask(projectId, taskId), version);
        queries.delete(projectId, taskId);
        return ResponseEntity.noContent().build();
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

        TaskResponseDTO response = TaskResponseDTO.from(createdTask);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<TaskResponseDTO> updateTask(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @RequestHeader(name = "If-Match", required = false) String version,
            @RequestHeader(name = "X-Task-Operation-Id", required = false) UUID operationId,
            @RequestBody UpdateTaskRequest dto) {

        Task currentTask = requireTask(projectId, taskId);
        if (operationId != null && operationId.equals(currentTask.getLastOperationId())) {
            return ResponseEntity.ok(response(currentTask));
        }
        checkVersion(currentTask, version);
        var command = dto.toCommand();
        command.setOperationId(operationId);
        Task updatedTask = updateTaskUseCase.updateTask(taskId, command);

        TaskResponseDTO response = TaskResponseDTO.from(updatedTask);
        return ResponseEntity.ok(response);
    }

    private void checkVersion(Task task, String version) {
        if (version != null && !Objects.equals(version, "\"" + task.getVersion() + "\"")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.PRECONDITION_FAILED, "Task changed since it was loaded");
        }
    }
}
