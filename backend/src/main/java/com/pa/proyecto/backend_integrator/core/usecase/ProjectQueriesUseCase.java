package com.pa.proyecto.backend_integrator.core.usecase;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.exception.ResourceNotFoundException;
public class ProjectQueriesUseCase {
 private final IProjectRepository repository;
 public ProjectQueriesUseCase(IProjectRepository repository){this.repository=repository;}
 public Project get(Long id){return repository.findById(id).orElseThrow(()->new ResourceNotFoundException("Project not found"));}
 public void delete(Long id){repository.delete(get(id));}
}
