package com.pa.proyecto.backend_integrator.core.output;

import com.pa.proyecto.backend_integrator.core.input.DTO.FindProjectsQueryDTO;
import com.pa.proyecto.backend_integrator.core.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IProjectRepository extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project> {

    // --- metodos que JpaRepository ya da ---
    // save(Project project)
    // findById(Long id)
    // findAll()

    Optional<Project> findByName(String name);

    boolean existsByName(String name);

    //List<Project> findWithFilters(FindProjectsQueryDTO queryDTO);
}