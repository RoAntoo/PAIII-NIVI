package com.pa.proyecto.backend_integrator.core.output;
import com.pa.proyecto.backend_integrator.core.model.*;
import java.util.*;
public interface ITaskRepository {
 java.util.List<Task> findRecent();
 Task save(Task task);
 Optional<Task> findById(Long id);
 Optional<Task> findByIdAndProjectId(Long id,Long projectId);
 List<Task> findByProjectId(Long projectId);
 boolean existsById(Long id);
}
