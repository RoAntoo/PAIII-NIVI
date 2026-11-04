package com.pa.proyecto.backend_integrator.core.input;

import com.pa.proyecto.backend_integrator.core.model.Task;

public interface IGetTaskByIdInput {
    Task getTaskById(Long id);
}