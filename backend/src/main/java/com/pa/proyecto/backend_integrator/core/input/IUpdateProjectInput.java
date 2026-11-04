package com.pa.proyecto.backend_integrator.core.input;

import com.pa.proyecto.backend_integrator.core.input.DTO.UpdateProjectDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;

public interface IUpdateProjectInput {
    Project updateProject(Long projectId, UpdateProjectDTO dto);
}
