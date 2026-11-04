package com.pa.proyecto.backend_integrator.core.input;

import com.pa.proyecto.backend_integrator.core.input.DTO.CreateTaskDTO;
import com.pa.proyecto.backend_integrator.core.model.Task;

public interface ITaskCreateInput {
    Task createTask(Long projectId, CreateTaskDTO dto);
}