package com.pa.proyecto.backend_integrator.core.usecase;
import com.pa.proyecto.backend_integrator.core.output.ITaskRepository;
import com.pa.proyecto.backend_integrator.core.model.Task;
import java.util.List;
public class RecentTasksUseCase {
 private final ITaskRepository repository;
 public RecentTasksUseCase(ITaskRepository repository){this.repository=repository;}
 public List<Task> find(){return repository.findRecent();}
}
