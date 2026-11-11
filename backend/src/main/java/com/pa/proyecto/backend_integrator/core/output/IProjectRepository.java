package com.pa.proyecto.backend_integrator.core.output;
import com.pa.proyecto.backend_integrator.core.model.*;
import java.util.*;
import com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO;
public interface IProjectRepository {
 Project save(Project project);
 Optional<Project> findById(Long id);
 boolean existsByName(String name);
 boolean existsById(Long id);
 List<ProjectSummary> findAll(FindProjectsQueryDTO query);
 void delete(Project project);
}
