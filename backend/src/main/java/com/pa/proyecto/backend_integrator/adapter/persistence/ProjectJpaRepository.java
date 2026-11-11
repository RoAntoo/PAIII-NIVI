package com.pa.proyecto.backend_integrator.adapter.persistence;
import com.pa.proyecto.backend_integrator.adapter.persistence.entity.ProjectEntity;
import org.springframework.data.jpa.repository.*;
public interface ProjectJpaRepository extends JpaRepository<ProjectEntity,Long>, JpaSpecificationExecutor<ProjectEntity> {
 @org.springframework.data.jpa.repository.EntityGraph(attributePaths="tasks")
 java.util.List<ProjectEntity> findAll(org.springframework.data.jpa.domain.Specification<ProjectEntity> specification);
 boolean existsByName(String name);
}
