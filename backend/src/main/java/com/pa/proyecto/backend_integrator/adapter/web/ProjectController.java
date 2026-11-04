package com.pa.proyecto.backend_integrator.adapter.web;

import com.pa.proyecto.backend_integrator.core.input.DTO.*;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus;
import com.pa.proyecto.backend_integrator.core.usecase.CreateProjectUseCase;
import com.pa.proyecto.backend_integrator.core.usecase.FindAllProjectsUseCase;
import com.pa.proyecto.backend_integrator.core.usecase.UpdateProjectUseCase;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final CreateProjectUseCase createProjectUseCase;
    private final UpdateProjectUseCase updateProjectUseCase;
    private final FindAllProjectsUseCase findAllProjectsUseCase;

    public ProjectController(CreateProjectUseCase createProjectUseCase,
                             UpdateProjectUseCase updateProjectUseCase,
                             FindAllProjectsUseCase findAllProjectsUseCase) {
        this.createProjectUseCase = createProjectUseCase;
        this.updateProjectUseCase = updateProjectUseCase;
        this.findAllProjectsUseCase = findAllProjectsUseCase;
    }

    private TaskResponseDTO mapTaskToResponse(Task task) {
        return new TaskResponseDTO(
                task.getId(), task.getTitle(), task.getEstimateHours(),
                task.getAssignee(), task.getStatus(), task.getFinishedAt(),
                task.getCreatedAt(), task.getProject().getId()
        );
    }

    private ProjectResponseDTO mapProjectToResponse(Project project) {
        return new ProjectResponseDTO(
                project.getId(), project.getName(), project.getStartDate(),
                project.getEndDate(), project.getStatus(), project.getDescription()
        );
    }

    // --- ENDPOINTS ---

    @PostMapping
    public ResponseEntity<ProjectResponseDTO> createProject(@RequestBody CreateProjectDTO dto) {
        Project createdProject = createProjectUseCase.createProject(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapProjectToResponse(createdProject));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectResponseDTO> updateProject(
            @PathVariable Long projectId,
            @RequestBody UpdateProjectDTO dto) {
        Project updatedProject = updateProjectUseCase.updateProject(projectId, dto);
        return ResponseEntity.ok(mapProjectToResponse(updatedProject));
    }

    /**
     * Endpoint para buscar proyectos con filtros.
     * HTTP 200 OK
     */
    @GetMapping
    public ResponseEntity<List<ProjectResponseDTO>> findProjects(
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate
    ) {
        FindProjectsQueryDTO query = new FindProjectsQueryDTO(
                Optional.ofNullable(status),
                Optional.ofNullable(startDate),
                Optional.ofNullable(endDate)
        );

        List<Project> projects = findAllProjectsUseCase.findAllProjects(query);

        List<ProjectResponseDTO> response = projects.stream()
                .map(this::mapProjectToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }
}