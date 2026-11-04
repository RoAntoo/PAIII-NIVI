package com.pa.proyecto.backend_integrator.core.input;

import com.pa.proyecto.backend_integrator.core.input.DTO.UpdateTaskDTO;
import com.pa.proyecto.backend_integrator.core.model.Task;

public interface IUpdateTaskInput {
    Task updateTask(Long id, UpdateTaskDTO dto);
}