package com.pa.proyecto.backend_integrator.core.usecase;
import com.pa.proyecto.backend_integrator.core.output.*;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import java.util.List;
public class TaskQueriesUseCase {
 private final ITaskRepository tasks;private final IProjectRepository projects;
 public TaskQueriesUseCase(ITaskRepository tasks,IProjectRepository projects){this.tasks=tasks;this.projects=projects;}
 public Task get(Long projectId,Long taskId){return tasks.findByIdAndProjectId(taskId,projectId).orElseThrow(()->new ResourceNotFoundException("Task not found in project"));}
 public List<Task> list(Long projectId){if(!projects.existsById(projectId))throw new ResourceNotFoundException("Project not found");return tasks.findByProjectId(projectId);}
}
