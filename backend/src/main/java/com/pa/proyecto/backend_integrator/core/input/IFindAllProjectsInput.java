package com.pa.proyecto.backend_integrator.core.input;

import com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import java.util.List;

public interface IFindAllProjectsInput {
    List<Project> findAllProjects(FindProjectsQueryDTO queryDTO);
}