package com.pa.proyecto.backend_integrator.adapter.persistence;
import com.pa.proyecto.backend_integrator.adapter.persistence.entity.ProjectEntity;
import org.springframework.data.jpa.repository.*;
public interface ProjectJpaRepository extends JpaRepository<ProjectEntity,Long>, JpaSpecificationExecutor<ProjectEntity> {
 boolean existsByName(String name);
}
