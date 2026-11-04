package com.pa.proyecto.backend_integrator.core.usecase;

import com.pa.proyecto.backend_integrator.adapter.persistence.ProjectSpecification;
import com.pa.proyecto.backend_integrator.core.input.IFindAllProjectsInput;
import com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import com.pa.proyecto.backend_integrator.core.output.IProjectRepository;
import org.springframework.data.jpa.domain.Specification; // Importar

import java.util.List;

public class FindAllProjectsUseCase implements IFindAllProjectsInput {

    private final IProjectRepository projectRepository;
    private final ProjectSpecification projectSpecification;

    public FindAllProjectsUseCase(IProjectRepository projectRepository,
                                  ProjectSpecification projectSpecification) {
        this.projectRepository = projectRepository;
        this.projectSpecification = projectSpecification;
    }

    @Override
    public List<Project> findAllProjects(FindProjectsQueryDTO queryDTO) {
        Specification<Project> spec = projectSpecification.build(queryDTO);

        return projectRepository.findAll(spec);
    }
}