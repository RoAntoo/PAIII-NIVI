package com.pa.proyecto.backend_integrator.core.usecase;
import com.pa.proyecto.backend_integrator.core.output.*;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
import java.util.List;
public class TaskQueriesUseCase {
 private final ITaskRepository tasks;private final IProjectRepository projects;
 /** Creates project-scoped task queries backed by the supplied repositories. */
 public TaskQueriesUseCase(ITaskRepository tasks,IProjectRepository projects){this.tasks=tasks;this.projects=projects;}
 /** Returns a task only when it belongs to the requested project. */
 public Task get(Long projectId,Long taskId){return tasks.findByIdAndProjectId(taskId,projectId).orElseThrow(()->new ResourceNotFoundException("Task not found in project"));}
 /** Lists tasks after checking that the parent project exists. */
 public List<Task> list(Long projectId){if(!projects.existsById(projectId))throw new ResourceNotFoundException("Project not found");return tasks.findByProjectId(projectId);}
 /** Deletes a project-owned task unless the project is closed. */
 public void delete(Long projectId, Long taskId) {
  Task task = get(projectId, taskId);
  if (task.getProject().getStatus() == com.pa.proyecto.backend_integrator.core.model.enums.ProjectStatus.CLOSED)
   throw new com.pa.proyecto.backend_integrator.core.exception.BusinessRuleViolationException("Cannot delete a task in a CLOSED project");
  tasks.delete(task);
 }
}
