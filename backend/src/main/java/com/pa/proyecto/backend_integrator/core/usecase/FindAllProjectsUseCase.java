package com.pa.proyecto.backend_integrator.core.usecase;
import com.pa.proyecto.backend_integrator.core.input.IFindAllProjectsInput;
import com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;
import java.util.List;
public class FindAllProjectsUseCase implements IFindAllProjectsInput {
 private final IProjectRepository repository;
 public FindAllProjectsUseCase(IProjectRepository repository){this.repository=repository;}
 public List<Project> findAllProjects(FindProjectsQueryDTO query){return repository.findAll(query);}
}
