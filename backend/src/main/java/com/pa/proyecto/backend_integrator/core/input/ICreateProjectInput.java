package com.pa.proyecto.backend_integrator.core.input;

import com.pa.proyecto.backend_integrator.core.input.DTO.CreateProjectDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;

public interface ICreateProjectInput {
    Project createProject(CreateProjectDTO dto);
}